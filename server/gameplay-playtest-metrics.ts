import { inSkiff } from '../src/actions.ts'
import { heldItem } from '../src/interactions/cargo.ts'
import type { FarmOrderId } from '../src/farm-orders.ts'
import type { JobId } from '../src/jobs.ts'
import { aerialProgress, type FlightResult } from '../src/aviation.ts'
import type { OutingId } from '../src/journal/outing.ts'
import type { InteractionAction } from '../src/interaction-options.ts'
import type { FishingResult, Player, Snapshot } from '../src/protocol.ts'
import { activeFavor } from '../src/residents/favors.ts'
import { starterResidents } from '../src/worlds/starter/residents.ts'
import type { CrewMember, CrewNotice } from './crew.ts'
import { crewInputTimeoutMs, millisecondsPerSecond } from './host-time.ts'
import { availableJobs, type JobBlock } from './job-choice.ts'

const minimumCoopSeats = 2
const sampleIntervalMs = 250
const activityGapMs = 45_000
const interactionHoldMs = 1250
const movementThresholdMps = 0.15

type TrackedJob = JobId | `produce:${FarmOrderId}`
type Mechanic = 'fishing' | 'farming' | 'rowing' | 'gliding' | 'fieldwork'
type FlightOuting = NonNullable<Snapshot['aviation']['flight']>['outing']
type Outcome = { mechanic: 'job-board', result: JobBlock | 'accepted', job: JobId }
  | { mechanic: 'fishing', result: FishingResult | 'cast' | 'line-retrieved-by-motion' }
  | { mechanic: 'gliding', result: FlightResult, outing: FlightOuting, aerialRecorded?: number }
  | { mechanic: 'fieldwork', result: 'observed' | 'unavailable', subject?: OutingId }
  | { mechanic: 'barrow', result: 'returned' | 'recalled' }
  | { mechanic: 'travel', result: 'respawned-from-water' | 'respawned-on-land' }
type CoopActivity = 'sleeping' | 'fishing' | 'flying' | 'rowing' | 'skiff-passenger' | 'truck-passenger' | 'truck-driver'
  | 'truck-bed' | 'barrow' | 'spraying' | 'holding-item' | 'swimming' | 'interacting' | 'on-foot' | 'unobserved' | 'co-op-ended'

export type GameplayMetricEvent =
  | { event: 'job-options', slot: number, choices: JobId[] }
  | { event: 'job-choice', slot: number, job: TrackedJob, choices: TrackedJob[], result: JobBlock | 'accepted' }
  | { event: 'job-resumed', job: TrackedJob, progress: number }
  | { event: 'job-progress', slot: number, job: TrackedJob, progress: number, target: number, complete: boolean }
  | { event: 'mechanic-use', slot: number, mechanic: Mechanic, repeat: boolean, relatedWork: string[] }
  | { event: 'co-op-activity', slot: number, activity: CoopActivity, vehicleMoving?: boolean, playerMoving?: boolean }
  | ({ event: 'gameplay-outcome', slot: number } & Exclude<Outcome, { mechanic: 'job-board' }>)
  | ({ event: 'gameplay-recovery', slot: number, after: Outcome['result'], attempts: number, durationMs: number } & Outcome)

type Emit = (state: Snapshot, event: GameplayMetricEvent) => void
type Episode = { lastUse: number, work: string }
type Setback = { firstAt: number, attempts: number, latest: Outcome['result'] }
type PositionSample = Pick<Player, 'x' | 'z'> & { at: number }
type Seat = {
  player: Player
  choices: string
  activity?: CoopActivity
  vehicleMoving?: boolean
  playerMoving?: boolean
  position?: PositionSample
  interactedAt: number
  episodes: Map<Mechanic, Episode>
  setbacks: Map<string, Setback>
}

function relatedWork(state: Snapshot, mechanic: Mechanic) {
  const job = state.jobs.active?.id
  if (mechanic === 'gliding') {
    const outing = state.aviation.flight?.outing
    if (outing === 'checkout' || outing === 'survey') return [`ridge:${outing}`]
    return aerialProgress(state).next.length ? ['ridge:aerial-log'] : []
  }
  if (mechanic !== 'farming' && mechanic !== 'fishing' && mechanic !== 'rowing') return []
  const goods = mechanic === 'farming' ? 'carrots' : 'fish'
  const work: string[] = []
  if (job === (goods === 'fish' ? 'market-fish' : 'market-carrots')) work.push(job)
  const { stage } = state.farmWork.progress
  if (goods === 'carrots' && (stage === 'starter' || stage === 'harvest')) work.push(`produce:${stage}`)
  for (const resident of starterResidents) {
    const favor = activeFavor(resident, state)
    if (favor && 'goods' in favor.kind && favor.kind.goods === goods) work.push(`favor:${favor.id}`)
  }
  return work
}

function activityOf(state: Snapshot, member: CrewMember, now: number, interacted: boolean): CoopActivity {
  const { player } = member
  if (player.sleeping) return 'sleeping'
  if (state.aviation.flight?.pilotId === player.id) return 'flying'
  if (player.casting || player.charge?.kind === 'cast') return 'fishing'
  if (inSkiff(player.seat)) return player.rowing ? 'rowing' : 'skiff-passenger'
  if (player.seat === 'driver') return 'truck-driver'
  if (player.seat === 'passenger') return 'truck-passenger'
  if (state.farmWork.barrow?.handler === player.id) return 'barrow'
  if (player.swimming) return 'swimming'
  const item = heldItem(state, player)
  if (item?.spraying) return 'spraying'
  if (item) return 'holding-item'
  if (interacted) return 'interacting'
  if (now - member.lastInput <= crewInputTimeoutMs && (member.input.x || member.input.z)) return 'on-foot'
  return player.onBed ? 'truck-bed' : 'unobserved'
}

function movingVehicle(state: Snapshot, activity: CoopActivity) {
  if (activity === 'truck-driver' || activity === 'truck-passenger' || activity === 'truck-bed') {
    return Math.abs(state.truck.speed) >= movementThresholdMps
  }
  if (activity === 'rowing' || activity === 'skiff-passenger') {
    return Math.abs(state.skiff.speed) >= movementThresholdMps
  }
}

function movingWithCargo(activity: CoopActivity, player: Player, before: PositionSample | undefined, now: number) {
  if (activity !== 'holding-item' && activity !== 'barrow') return undefined
  if (!before) return false
  const travel = Math.hypot(player.x - before.x, player.z - before.z)
  return travel > movementThresholdMps * (now - before.at) / millisecondsPerSecond
}

function retryKey(outcome: Outcome, inspection?: number) {
  if (outcome.mechanic === 'fieldwork') return inspection === undefined ? undefined : `fieldwork:${inspection}`
  if (outcome.mechanic === 'job-board') return `job:${outcome.job}`
  if (outcome.mechanic === 'gliding') return `gliding:${outcome.outing}`
  if (outcome.mechanic === 'fishing' && ['cast', 'dry-cast', 'boat-moving', 'line-retrieved-by-motion'].includes(outcome.result)) return 'fishing:cast'
  return outcome.mechanic
}

function retryResult(outcome: Outcome) {
  switch (outcome.mechanic) {
    case 'job-board': return outcome.result === 'accepted' ? 'success' : 'setback'
    case 'fishing':
      if (outcome.result === 'no-bite') return undefined
      return outcome.result === 'cast' || outcome.result === 'caught' ? 'success' : 'setback'
    case 'gliding':
      if (outcome.result === 'interrupted') return undefined
      return ['qualified', 'surveyed', 'landed'].includes(outcome.result) ? 'success' : 'setback'
    case 'fieldwork': return outcome.result === 'observed' ? 'success' : 'setback'
    case 'barrow':
    case 'travel': return undefined
  }
}

export function createGameplayPlaytestMetrics(emit: Emit, clock: () => number) {
  const seats = new Map<number, Seat>()
  let nextSample = -Infinity

  function seatFor(player: Player) {
    const existing = seats.get(player.id)
    if (existing?.player === player) return existing
    const seat: Seat = { player, choices: '', interactedAt: -Infinity, episodes: new Map(), setbacks: new Map() }
    seats.set(player.id, seat)
    return seat
  }

  function roster(state: Snapshot) {
    const connected = state.players.filter((player) => player.connected)
    if (connected.length < minimumCoopSeats) {
      for (const [slot, seat] of seats) {
        if (seat.activity) emit(state, { event: 'co-op-activity', slot, activity: 'co-op-ended' })
        seat.activity = undefined
        seat.position = undefined
      }
    }
    for (const [slot, seat] of seats) {
      if (connected.includes(seat.player)) continue
      if (seat.activity) emit(state, { event: 'co-op-activity', slot, activity: 'co-op-ended' })
      seats.delete(slot)
    }
  }

  function touch(player: Player) {
    seatFor(player).interactedAt = clock()
  }

  function use(state: Snapshot, player: Player, mechanic: Mechanic, work = relatedWork(state, mechanic)) {
    const seat = seatFor(player)
    const now = clock()
    if (mechanic === 'farming' || mechanic === 'fieldwork') seat.interactedAt = now
    const previous = seat.episodes.get(mechanic)
    const key = work.join(',')
    if (!previous || mechanic === 'gliding' || now - previous.lastUse >= activityGapMs || previous.work !== key) {
      emit(state, { event: 'mechanic-use', slot: player.id, mechanic, repeat: Boolean(previous), relatedWork: work })
    }
    seat.episodes.set(mechanic, { lastUse: now, work: key })
  }

  function tick(state: Snapshot, members: CrewMember[], now: number) {
    const sampledAt = clock()
    if (sampledAt < nextSample) return
    nextSample = sampledAt + sampleIntervalMs
    const connected = members.filter(({ player }) => player.connected)
    for (const member of connected) {
      const { player } = member
      const seat = seatFor(player)
      const choices = availableJobs(state, player)
      const key = choices.join(',')
      if (key !== seat.choices && choices.length) emit(state, { event: 'job-options', slot: player.id, choices })
      seat.choices = key
      if (player.rowing) use(state, player, 'rowing')
      if (connected.length < minimumCoopSeats) continue
      const activity = activityOf(state, member, now, sampledAt - seat.interactedAt < interactionHoldMs)
      const vehicleMoving = movingVehicle(state, activity)
      const playerMoving = movingWithCargo(activity, player, seat.position, sampledAt)
      if (activity !== seat.activity || vehicleMoving !== seat.vehicleMoving || playerMoving !== seat.playerMoving) {
        emit(state, { event: 'co-op-activity', slot: player.id, activity, vehicleMoving, playerMoving })
      }
      seat.activity = activity
      seat.vehicleMoving = vehicleMoving
      seat.playerMoving = playerMoving
      seat.position = { x: player.x, z: player.z, at: sampledAt }
    }
  }

  function result(state: Snapshot, player: Player, outcome: Outcome, inspection?: number) {
    if (outcome.mechanic !== 'job-board') emit(state, { event: 'gameplay-outcome', slot: player.id, ...outcome })
    const status = retryResult(outcome)
    const key = retryKey(outcome, inspection)
    if (!status || !key) return
    const { setbacks } = seatFor(player)
    const previous = setbacks.get(key)
    const now = clock()
    if (status === 'setback') {
      setbacks.set(key, { firstAt: previous?.firstAt ?? now, attempts: (previous?.attempts ?? 0) + 1, latest: outcome.result })
    }
    else if (previous) {
      setbacks.delete(key)
      emit(state, {
        event: 'gameplay-recovery',
        slot: player.id,
        ...outcome,
        after: previous.latest,
        attempts: previous.attempts,
        durationMs: Math.round(now - previous.firstAt),
      })
    }
  }

  function choice(state: Snapshot, player: Player, job: JobId, blocked?: JobBlock) {
    const outcome = blocked ?? 'accepted'
    if (!blocked) touch(player)
    emit(state, { event: 'job-choice', slot: player.id, job, choices: availableJobs(state, player), result: outcome })
    result(state, player, { mechanic: 'job-board', result: outcome, job })
  }

  function interaction(state: Snapshot, player: Player, action: InteractionAction) {
    touch(player)
    if (action === 'plant' || action === 'harvest') use(state, player, 'farming')
    if (action === 'recall-barrow') result(state, player, { mechanic: 'barrow', result: 'recalled' })
  }

  function notice(state: Snapshot, notice: CrewNotice, slot?: number) {
    if (notice.type !== 'barrow-returned' || slot === undefined) return
    emit(state, { event: 'gameplay-outcome', slot, mechanic: 'barrow', result: 'returned' })
  }

  return { roster, tick, use, result, choice, interaction, notice, touch, emit }
}

export type GameplayPlaytestMetrics = ReturnType<typeof createGameplayPlaytestMetrics>
