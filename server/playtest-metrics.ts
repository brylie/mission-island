import { toolboxItem, toolboxLoanForSwollenGate, wrenLendsToolbox } from '../src/gate-repair.ts'
import type { TrialRun } from '../src/live-checkpoints.ts'
import type { Snapshot } from '../src/protocol.ts'
import { residentAt } from '../src/residents/schedule.ts'
import { standingOf } from '../src/residents/trust.ts'
import { starterResident, starterResidents } from '../src/worlds/starter/residents.ts'
import type { CrewMember, CrewNotice } from './crew.ts'
import { createGameplayPlaytestMetrics, type GameplayMetricEvent } from './gameplay-playtest-metrics.ts'

type HouseholdState = Pick<ReturnType<typeof residentAt>, 'stop' | 'indoors' | 'windowLit'>
type WrenState = {
  trust: number
  standing: ReturnType<typeof standingOf>
  freeLoan: boolean
  swollenGateLoan: boolean
  toolboxHolder: number | null
}

type MetricEvent = GameplayMetricEvent
  | { event: 'run-start', checkpoint: string | null, seats: number | null }
  | { event: 'crew', connectedSlots: number[] }
  | { event: 'sleep-skip', fromIslandTime: number }
  | ({ event: 'household', resident: string } & HouseholdState)
  | ({ event: 'wren-state' } & WrenState)
  | { event: 'gate-step', step: 'caught' | 'clear' | 'planed', slot: number | null }
  | { event: 'favor-accepted', resident: string, favor: string, slot: number }
  | { event: 'favor-paid', resident: string, favor: string, residentStop: HouseholdState['stop'], slot: number | null, coins: number, trustChange: number, restored: boolean }
  | { event: 'wren-report', favor: string, slot: number, result: 'honest' | 'broken', trustChange: number }

type Metric = MetricEvent & { run: number, elapsedMs: number, islandTime: number, islandHour: number }

function wrenState(state: Snapshot): WrenState {
  const record = state.residents.wren
  return {
    trust: record.trust,
    standing: standingOf(record),
    freeLoan: wrenLendsToolbox(state),
    swollenGateLoan: toolboxLoanForSwollenGate(state),
    toolboxHolder: toolboxItem(state)?.holder ?? null,
  }
}

// Each game gets a new run in the same log when the crew switches or restarts a checkpoint.
export function createPlaytestMetrics(write: (metric: Metric) => void, clock = () => performance.now()) {
  let runCount = 0
  return (trial?: TrialRun) => {
    const run = ++runCount
    let startedAt: number | undefined
    let connectedSlots: number[] = []
    let previousWren: WrenState | undefined
    const households = new Map<string, HouseholdState>()

    function emit(state: Snapshot, event: MetricEvent) {
      if (startedAt === undefined) return
      write({ ...event, run, elapsedMs: Math.round(clock() - startedAt), islandTime: state.islandTime, islandHour: state.weather.hour })
    }

    const gameplay = createGameplayPlaytestMetrics(emit, clock)

    function startRun(state: Snapshot) {
      startedAt = clock()
      emit(state, { event: 'run-start', checkpoint: trial?.checkpoint ?? null, seats: trial?.seats ?? null })
      const order = state.jobs.active
      if (order) emit(state, { event: 'job-resumed', job: order.id, progress: order.progress })
      const { stage, delivered } = state.farmWork.progress
      if (stage === 'starter' || stage === 'harvest') emit(state, { event: 'job-resumed', job: `produce:${stage}`, progress: delivered })
    }

    function sample(state: Snapshot, skippedFrom?: number, crew?: { members: CrewMember[], now: number }) {
      const slots = state.players.filter(({ connected }) => connected).map(({ id }) => id).sort((a, b) => a - b)
      if (startedAt === undefined) {
        if (!slots.length) return
        startRun(state)
      }
      if (slots.length !== connectedSlots.length || slots.some((slot, index) => slot !== connectedSlots[index])) {
        connectedSlots = slots
        emit(state, { event: 'crew', connectedSlots })
        gameplay.roster(state)
      }
      if (!slots.length) {
        // On return, record a fresh baseline for the crew. No one observed the intervening routines.
        households.clear()
        previousWren = undefined
        return
      }
      if (skippedFrom !== undefined) emit(state, { event: 'sleep-skip', fromIslandTime: skippedFrom })
      if (crew) gameplay.tick(state, crew.members, crew.now)

      for (const { id, schedule } of starterResidents) {
        const { stop, indoors, windowLit } = residentAt(schedule, state)
        const previous = households.get(id)
        if (previous?.stop === stop && previous.indoors === indoors && previous.windowLit === windowLit) continue
        const current = { stop, indoors, windowLit }
        households.set(id, current)
        emit(state, { event: 'household', resident: id, ...current })
      }

      const current = wrenState(state)
      if (previousWren?.trust === current.trust && previousWren.standing === current.standing
        && previousWren.freeLoan === current.freeLoan && previousWren.swollenGateLoan === current.swollenGateLoan
        && previousWren.toolboxHolder === current.toolboxHolder) return
      previousWren = current
      emit(state, { event: 'wren-state', ...current })
    }

    function notice(state: Snapshot, notice: CrewNotice, slot?: number) {
      if (startedAt === undefined) sample(state)
      gameplay.notice(state, notice, slot)
      if (notice.type === 'gate-step' && (notice.step === 'caught' || notice.step === 'clear' || notice.step === 'planed')) {
        emit(state, { event: notice.type, step: notice.step, slot: slot ?? null })
      }
      if (notice.type === 'favor-accepted') {
        emit(state, { event: notice.type, resident: notice.resident, favor: notice.favor, slot: notice.playerId })
      }
      if (notice.type === 'favor-pay') {
        const resident = starterResident(notice.resident)
        if (!resident) return
        const { stop: residentStop } = residentAt(resident.schedule, state)
        emit(state, {
          event: 'favor-paid',
          resident: resident.id,
          favor: notice.favor,
          residentStop,
          slot: slot ?? null,
          coins: notice.coins,
          trustChange: notice.trust,
          restored: notice.restored,
        })
      }
      if (notice.type === 'favor-report' && notice.resident === 'wren') {
        emit(state, {
          event: 'wren-report',
          favor: notice.favor,
          slot: notice.playerId,
          result: notice.result,
          trustChange: notice.trust,
        })
      }
    }

    return { sample, notice, gameplay }
  }
}

export type PlaytestMetricsRun = ReturnType<ReturnType<typeof createPlaytestMetrics>>
