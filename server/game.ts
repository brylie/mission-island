import type { TrialRun } from '../src/live-checkpoints.ts'
import { prepareTrial } from './live-checkpoints.ts'
import { createDriftwoodSchool } from '../src/simulation/driftwood-school.ts'
import { inSkiff } from '../src/actions.ts'
import { chargePower } from '../src/charged-actions.ts'
import { createJuniperHabitat } from '../src/juniper-habitat.ts'
import type { Snapshot } from '../src/protocol.ts'
import { createCargoPhysics } from '../src/simulation/cargo.ts'
import type { CrewCommand } from './commands.ts'
import { createCrewRoster, disconnect, stopPrimary, stopped, type CrewMember, type CrewNotice } from './crew.ts'
import { jump, walkCrew } from './crew-motion.ts'
import { createEquipment, setAppearance } from './equipment.ts'
import { advanceIsland } from './island-clock.ts'
import { createInteractions } from './interactions.ts'
import { restoreIsland, saveIsland } from './island-state.ts'
import { updateHeldItems } from './items.ts'
import { createFreight } from './freight.ts'
import { createGateRepair } from './gate-repair.ts'
import { createOrders } from './orders.ts'
import { toggleSeat, updateRiders } from './riders.ts'
import type { IslandSave } from './save.ts'
import { stepSkiff } from './skiff.ts'

export const tickSeconds = 1 / 30

interface GameOptions {
  clock?: () => number
  random?: () => number
  playtest?: TrialRun
  save?: IslandSave
  checkpoint?: () => void
}

export function createGame({ clock = Date.now, random = Math.random, save, checkpoint, playtest }: GameOptions = {}) {
  const physics = createCargoPhysics()
  const juniper = createJuniperHabitat()
  const driftwood = createDriftwoodSchool(clock() >>> 0)
  const { state, growth } = restoreIsland(physics, juniper, driftwood.frame(), save)
  const trial = playtest && prepareTrial(state, playtest)
  let wildlifeTick = 0
  const crew = createCrewRoster(state, save?.crew ?? [], clock, physics, checkpoint, playtest?.seats)
  const freight = createFreight(crew, state, clock, checkpoint)
  const orders = createOrders(state, physics, crew.notifyAll, freight.creditCrate, checkpoint)
  const equipment = createEquipment(state, physics, tickSeconds, random, checkpoint)
  const gate = createGateRepair(state, crew.notifyAll)
  const interactions = createInteractions(state, growth, physics, orders, gate, checkpoint)

  function tick(): Readonly<Snapshot> {
    const now = clock()
    if (trial && !state.playtest?.started && !trial.startWhenReady()) {
      crew.expireCrew(now)
      return state
    }
    advanceIsland(state, growth, tickSeconds, checkpoint)
    crew.expireCrew(now)
    gate.tick()
    physics.placeGateLeaf(state)
    const members = crew.members()
    const active = (member: CrewMember) => member.player.connected && member.lastInput >= now - 400
    const driver = members.find((member) => member.player.seat === 'driver')
    const before = state.truck
    state.truck = physics.step(state.items, before, driver && active(driver) ? driver.input : stopped, tickSeconds)
    if (driver && active(driver)) freight.recordDrive(driver.player, state.items, Math.hypot(state.truck.x - before.x, state.truck.z - before.z))
    const rowers = members.filter((member) => inSkiff(member.player.seat) && active(member))
    const still = stepSkiff(state.skiff, rowers.map((member) => member.input), tickSeconds)
    updateRiders(state)
    for (const member of members) {
      const { player, input } = member
      player.rowing = Boolean(inSkiff(player.seat) && active(member) && (input.x || input.z))
    }
    for (const item of state.items) item.spraying = false
    for (const member of members) {
      const { player } = member
      const connected = active(member)
      player.reaching = false
      player.rightHandRaised = false
      player.throwing = now < member.throwUntil
      if (!connected) stopPrimary(member)
      equipment.updateFishing(member, connected && equipment.isReadyToCast(member) && (!inSkiff(player.seat) || still))
      if (player.charge && member.primary) {
        player.charge.power = chargePower(player.charge.kind, (now - member.primary.since) / 1000)
      }
      if (player.seat) {
        member.verticalSpeed = 0
        member.reachUntil = 0
        continue
      }
      walkCrew(state, member, before, connected, now, tickSeconds, orders.completeFire, checkpoint)
    }
    updateHeldItems(state)
    state.driftwood = driftwood.step(state.players, state.skiff)
    // Animal motion follows real simulation ticks, even when the crew sleeps through the night.
    if (++wildlifeTick % 3 === 0) {
      state.juniper = juniper(wildlifeTick * tickSeconds, state.weather, state.players.filter(p => p.connected && !p.sleeping))
    }
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
        setAppearance(member.player, message.appearance, state.mission)
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
        interactions.interact(member, message.intent)
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
        break
    }
  }

  function join(token: string, notify: (message: CrewNotice) => void) {
    const member = crew.join(token, notify)
    if (typeof member === 'string') return { type: member } as const
    if (trial && !state.playtest?.started) trial.place(member.player)
    return {
      type: 'joined' as const,
      id: member.player.id,
      dispatch(message: CrewCommand) {
        if (member.notify === notify && (!trial || state.playtest?.started)) handleAction(member, message)
      },
      disconnect() {
        if (member.notify !== notify) return
        disconnect(member, clock())
        gate.releasePin(member.player.id)
      },
    }
  }

  return {
    tick,
    join,
    freight,
    snapshotForSave: () => saveIsland(state, growth, crew.savedProfiles()),
    get crewCoins() { return state.crewCoins },
  }
}
