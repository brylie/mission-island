import type { TrialRun } from '../src/live-checkpoints.ts'
import { prepareTrial } from './live-checkpoints.ts'
import { createDriftwoodSchool } from '../src/simulation/driftwood-school.ts'
import { createAviation } from './aviation.ts'
import { inSkiff } from '../src/actions.ts'
import { createJuniperHabitat } from '../src/juniper-habitat.ts'
import type { Snapshot } from '../src/protocol.ts'
import { createCargoPhysics } from '../src/simulation/cargo.ts'
import type { CrewCommand } from './commands.ts'
import { createLearnerFleet } from './learner-fleet.ts'
import { createCrewRoster, disconnect, stopped, type CrewBroadcast, type CrewMember, type CrewNotice } from './crew.ts'
import { jump, prepareCrewMotion, walkCrew } from './crew-motion.ts'
import { createEquipment, setAppearance } from './equipment.ts'
import { advanceIsland } from './island-clock.ts'
import { createGameInteractions } from './game-interactions.ts'
import { restoreIsland, saveIsland } from './island-state.ts'
import { updateHeldItems } from './items.ts'
import { createFreight } from './freight.ts'
import { createJournal } from './journal.ts'
import { createOrders } from './orders.ts'
import { burningHotspots } from '../src/wildfire.ts'
import { toggleSeat, updateRiders } from './riders.ts'
import type { IslandSave } from './save.ts'
import { farmingQualified } from '../src/farm-orders.ts'
import { stepSkiff } from './skiff.ts'
import { crewInputTimeoutMs } from './host-time.ts'
import type { PlaytestMetricsRun } from './playtest-metrics.ts'
import type { PlaytestEvent } from '../src/playtest-events.ts'

const hostTicksPerSecond = 30
const juniperUpdateIntervalTicks = 3

export const tickSeconds = 1 / hostTicksPerSecond
const barrowBlockedCommands = new Set<CrewCommand['type']>(['primary', 'equip', 'jump', 'seat', 'buy-seed', 'take-job'])

type GameOptions = {
  clock?: () => number
  random?: () => number
  playtest?: TrialRun
  save?: IslandSave
  checkpoint?: () => void
  metrics?: PlaytestMetricsRun
  // Tooling hook for a checkpoint run: adjusts the prepared world before the first tick, such as a sim sweep reseeding island events.
  prepare?: (state: Snapshot) => void
}

// The truck carries its driver's input and records driven distance; the skiff moves with its rowers.
// Crate sound cues carry IDs that stay unique for the life of the host process.
const impactIdRadix = 36
const impactSession = Date.now().toString(impactIdRadix)
let impactCount = 0

function stepVehicles(
  state: Snapshot,
  members: CrewMember[],
  active: (member: CrewMember) => boolean,
  physics: ReturnType<typeof createCargoPhysics>,
  freight: ReturnType<typeof createFreight>,
  fleet: ReturnType<typeof createLearnerFleet>,
  notifyAll: (notice: CrewNotice) => void,
) {
  // A truck seat without a learner vehicle is the flatbed's.
  const driver = members.find((member) => member.player.seat === 'driver' && !member.player.vehicle)
  const before = state.truck
  physics.placeBarrow(state.farmWork.barrow)
  state.truck = physics.step(state.items, before, driver && active(driver) ? driver.input : stopped, tickSeconds, fleet.fleetStep(members, active))
  fleet.afterStep()
  for (const impact of physics.drainImpacts()) notifyAll({ type: 'crate-impact', id: `${impactSession}:${++impactCount}`, ...impact })
  if (driver && active(driver)) freight.recordDrive(driver.player, state.items, Math.hypot(state.truck.x - before.x, state.truck.z - before.z))
  const rowers = members.filter((member) => inSkiff(member.player.seat) && active(member))
  const still = stepSkiff(state.skiff, rowers.map((member) => member.input), tickSeconds)
  updateRiders(state)
  for (const member of members) {
    const { player, input } = member
    player.rowing = Boolean(inSkiff(player.seat) && active(member) && (input.x || input.z))
  }
  return { before, still }
}

function stepWildlife(state: Snapshot, driftwood: ReturnType<typeof createDriftwoodSchool>, juniper: ReturnType<typeof createJuniperHabitat>, tick: number) {
  state.driftwood = driftwood.step(state.players, state.skiff)
  // Animal motion follows real simulation ticks, even when the crew sleeps through the night.
  if (tick % juniperUpdateIntervalTicks === 0) {
    state.juniper = juniper(tick * tickSeconds, state.weather, state.players.filter((p) => p.connected && !p.sleeping), burningHotspots(state.events.fire))
  }
}

// A checkpoint can arrange the ferry stage, the truck and loose crates, so physics follows the arranged world.
function settleTrial<T>(state: Snapshot, physics: ReturnType<typeof createCargoPhysics>, fleet: ReturnType<typeof createLearnerFleet>, trial: T, prepare?: (state: Snapshot) => void) {
  prepare?.(state)
  physics.placeFerry(state)
  state.truck = physics.parkTruck(state.truck)
  fleet.park()
  for (const item of state.items) physics.restore(item)
  return trial
}

// Live playtests can start an island event on demand. Ordinary games refuse.
function runPlaytestEvent(state: Snapshot, wildfire: ReturnType<typeof createGameInteractions>['wildfire'], event: PlaytestEvent) {
  if (!state.playtest) return { ok: false, text: 'Island events start on demand only in a live playtest.' }
  if (!state.playtest.started) return { ok: false, text: 'Start the checkpoint before starting an event.' }
  return event.type === 'wildfire' ? wildfire.start(event) : wildfire.end()
}

function observeCrewNotices(state: Snapshot, notifyCrew: CrewBroadcast, metrics?: PlaytestMetricsRun): CrewBroadcast {
  if (!metrics) return notifyCrew
  return (notice, slot) => {
    notifyCrew(notice)
    metrics.notice(state, notice, slot)
  }
}

export function createGame({ clock = Date.now, random = Math.random, save, checkpoint, playtest, metrics, prepare }: GameOptions = {}) {
  const physics = createCargoPhysics(), juniper = createJuniperHabitat(), driftwood = createDriftwoodSchool(clock() >>> 0)
  const { state, growth } = restoreIsland(physics, juniper, driftwood.frame(), save, random)
  const fleet = createLearnerFleet(state, physics, (notice) => crew.notifyAll(notice), checkpoint)
  const trial = playtest && settleTrial(state, physics, fleet, prepareTrial(state, playtest), prepare)
  let wildlifeTick = 0
  const crew = createCrewRoster(state, save?.crew ?? [], clock, physics, checkpoint, playtest?.seats)
  const freight = createFreight(crew, state, clock, checkpoint)
  const orders = createOrders(state, physics, crew.notifyAll, freight.creditCrate, checkpoint, metrics?.gameplay)
  const journal = createJournal(state, checkpoint, metrics?.gameplay)
  const equipment = createEquipment(state, physics, tickSeconds, random, journal.landed, checkpoint, metrics?.gameplay, fleet.gear)
  const { interactions, gate, residents, farm, wildfire }
    = createGameInteractions({ state, growth }, physics, { notifyCrew: observeCrewNotices(state, crew.notifyAll, metrics), orders, freight, journal, clock, checkpoint, metrics: metrics?.gameplay })
  const aviation = createAviation(state, crew.notifyAll, checkpoint, metrics?.gameplay)

  function tick(): Readonly<Snapshot> {
    const now = clock()
    if (trial && !state.playtest?.started && !trial.startWhenReady()) {
      crew.expireCrew(now)
      return state
    }
    const skippedFrom = advanceIsland(state, growth, tickSeconds, checkpoint)
    crew.expireCrew(now)
    gate.tick()
    residents.tick()
    for (const place of [physics.placeGateLeaf, physics.placeFerry]) place(state)
    const members = crew.members()
    const active = (member: CrewMember) => member.player.connected && member.lastInput >= now - crewInputTimeoutMs
    const { before, still } = stepVehicles(state, members, active, physics, freight, fleet, crew.notifyAll)
    for (const item of state.items) item.spraying = false
    for (const member of members) {
      const { player } = member
      const connected = active(member)
      if (aviation.tick(member, connected)) continue
      prepareCrewMotion(member, connected, now)
      equipment.updateFishing(member, connected && equipment.isReadyToCast(member) && (!inSkiff(player.seat) || still))
      if (player.seat) {
        member.verticalSpeed = 0
        member.reachUntil = 0
        continue
      }
      walkCrew(state, member, before, connected, now, tickSeconds, { completeFire: orders.completeFire, wildfire: wildfire.spray }, journal.explore)
      farm.tick(player)
    }
    wildfire.tick(tickSeconds)
    updateHeldItems(state)
    stepWildlife(state, driftwood, juniper, ++wildlifeTick)
    metrics?.sample(state, skippedFrom, { members, now })
    return state
  }

  function handleAction(member: CrewMember, message: CrewCommand) {
    switch (message.type) {
      case 'input':
        member.input = message.input
        member.lastInput = clock()
        if (member.input.x || member.input.z) member.player.sleeping = false
        break
      case 'primary':
        equipment.handlePrimary(member, message, clock())
        break
      case 'equip':
        equipment.equip(member, message.item)
        break
      case 'appearance':
        setAppearance(member.player, message.appearance, state.mission, farmingQualified(state.farmWork.progress.stage))
        checkpoint?.()
        break
      case 'crew-name':
        member.player.name = message.name
        checkpoint?.()
        break
      case 'buy-seed':
        orders.buySeed(member.player)
        break
      case 'buy-angler':
        member.notify?.({ type: 'angler-purchase', result: orders.buyClothing(member.player, 'angler') })
        break
      case 'buy-clothing': {
        const result = orders.buyClothing(member.player, message.item)
        member.notify?.({ type: 'clothing-purchase', item: message.item, result })
        break
      }
      case 'interact':
        interactions.interact(member, message.choice)
        // Save order progress, completion, and crew payouts together.
        checkpoint?.()
        break
      case 'seat':
        if (!member.player.sleeping) toggleSeat(state, member)
        break
      case 'jump':
        jump(member)
        break
      case 'take-job':
        orders.startJob(member, message.id)
        break
      case 'respawn':
        interactions.respawn(member)
        farm.recover(member.player.id)
        break
    }
  }

  function dispatch(member: CrewMember, message: CrewCommand) {
    const pushing = state.farmWork.barrow?.handler === member.player.id
    if (pushing && barrowBlockedCommands.has(message.type)) return
    if (aviation.hasFlight(member)) {
      if (message.type === 'respawn') aviation.interrupt(member)
      if (message.type !== 'input' && message.type !== 'appearance' && message.type !== 'crew-name') return
    }
    else if (message.type === 'interact' && !pushing && aviation.interact(member)) return
    handleAction(member, message)
  }

  function join(token: string, notify: (message: CrewNotice) => void) {
    const member = crew.join(token, notify)
    if (typeof member === 'string') return { type: member } as const
    if (trial && !state.playtest?.started) trial.place(member.player)
    else metrics?.sample(state)
    return {
      type: 'joined' as const,
      id: member.player.id,
      dispatch(message: CrewCommand) {
        if (member.notify === notify && (!trial || state.playtest?.started)) dispatch(member, message)
      },
      disconnect() {
        if (member.notify !== notify) return
        disconnect(member, clock())
        gate.releasePin(member.player.id)
        farm.recover(member.player.id)
        aviation.interrupt(member)
        if (!trial || state.playtest?.started) metrics?.sample(state)
      },
    }
  }

  return {
    tick,
    join,
    freight,
    playtestEvent: (event: PlaytestEvent) => runPlaytestEvent(state, wildfire, event),
    snapshotForSave: () => saveIsland(state, growth, aviation.groundSavedPilot(crew.savedProfiles())),
    get crewCoins() { return state.crewCoins },
  }
}
