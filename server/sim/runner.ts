import { createGame, tickSeconds } from '../game.ts'
import type { CrewCommand } from '../commands.ts'
import type { CrewNotice } from '../crew.ts'
import { scenarioFor } from '../scenarios/catalog.ts'
import { recoveryStage } from '../../src/lookout-recovery.ts'
import type { Snapshot } from '../../src/protocol.ts'
import { seededRandom } from '../../src/seeded-random.ts'
import { daySeconds, hoursPerDay } from '../../src/weather.ts'
import { burningHotspots } from '../../src/wildfire.ts'
import { scriptedCrewCommands, type CrewPolicy } from './crew-policy.ts'

// A host run with a virtual clock: no sockets, no rendering and no waiting on real time.
const millisecondsPerSecond = 1000
const tickMs = tickSeconds * millisecondsPerSecond
const virtualEpochMs = 1_000_000
// Island events draw from their own seed. Mixing the run seed in keeps scenario seeds distinct per run.
const eventSeedMix = 2654435761
const eventSeedRange = 2147483648
// Weather rows report the rain state, not every change in intensity.
const showerThreshold = 0.05
const tokenLength = 32
const hourDecimals = 2
const tokenLetters = 'abcdefghijklmnopqrstuvwxyz'

export const simulationVersion = 1

export interface SimRun {
  scenario: string
  days: number
  seed: number
  crew: CrewPolicy
}

export interface RecordedInput {
  tick: number
  seat: number
  command: CrewCommand
}

export interface SimEvent {
  seed: number
  tick: number
  day: number
  hour: number
  type: string
  [field: string]: unknown
}

type Emit = (event: SimEvent) => void

function crewToken(seat: number) {
  return tokenLetters[seat % tokenLetters.length].repeat(tokenLength)
}

function eventSeed(seed: number) {
  return (Math.imul(seed + 1, eventSeedMix) >>> 0) % eventSeedRange
}

// Compares two frames and emits one row for each change a designer would chart.
function createObserver(run: SimRun, emit: Emit) {
  let tick = 0
  let fireId: number | undefined
  let raining: boolean | undefined
  let stage: string | undefined
  const behaviors = new Map<string, string>()
  const row = (state: Readonly<Snapshot>, type: string, fields: Record<string, unknown> = {}) => emit({
    ...fields,
    seed: run.seed,
    tick,
    day: Math.floor(state.islandTime / daySeconds),
    hour: Number(state.weather.hour.toFixed(hourDecimals)),
    type,
  })

  function notice(state: Readonly<Snapshot>, message: CrewNotice) {
    if (message.type !== 'wildfire' || message.event === 'clear' || message.event === 'bearing' || message.event === 'smoke') return
    row(state, `fire-${message.event}`, { ...message, type: undefined, event: undefined, fire: state.events.fire?.id ?? state.events.lastFire?.id })
  }

  function frame(state: Readonly<Snapshot>, nextTick: number) {
    tick = nextTick
    const fire = state.events.fire
    if (fire && fire.id !== fireId) row(state, 'fire-started', { fire: fire.id, site: fire.site, size: fire.size, hotspots: fire.hotspots.length })
    fireId = fire?.id
    const wet = state.weather.rain > showerThreshold
    if (wet !== raining) row(state, 'weather', { rain: wet ? 'shower' : 'dry' })
    raining = wet
    const last = state.events.lastFire
    const nextStage = last && `${last.id}:${recoveryStage(last.endedAt, state.islandTime)}`
    if (last && nextStage !== stage) row(state, 'regrowth', { fire: last.id, site: last.site, stage: nextStage?.split(':')[1], burned: last.burned?.length ?? 0 })
    stage = nextStage
    const animals = [...state.juniper.hares.map((a, i) => [`hare-${i}`, a.behavior] as const), ...state.juniper.foxes.map((a, i) => [`fox-${i}`, a.behavior] as const)]
    for (const [id, behavior] of animals) {
      if (behaviors.has(id) && behaviors.get(id) !== behavior) row(state, 'animal', { animal: id, from: behaviors.get(id), to: behavior })
      behaviors.set(id, behavior)
    }
  }

  return { notice, frame }
}

export interface SimResult {
  run: SimRun
  ticks: number
  inputs: RecordedInput[]
  burningAtEnd: number
}

// Steps the host game for the requested island days. Replaying passes the inputs a recorded run sent.
export function runSimulation(run: SimRun, emit: Emit, replay?: readonly RecordedInput[]): SimResult {
  const scenario = scenarioFor(run.scenario)
  let now = virtualEpochMs
  const game = createGame({ clock: () => now, random: seededRandom(run.seed), playtest: { checkpoint: scenario.id, seats: 1, revision: 1 } })
  const observer = createObserver(run, emit)
  let state: Readonly<Snapshot> | undefined
  const seat = game.join(crewToken(0), (message) => {
    if (state) observer.notice(state, message)
  })
  if (seat.type !== 'joined') throw new Error(`The sim crew could not join: ${seat.type}`)
  const totalTicks = Math.round(run.days * daySeconds / tickSeconds)
  const inputs: RecordedInput[] = []
  const queued = [...(replay ?? [])]
  for (let tick = 0; tick < totalTicks; tick++) {
    now += tickMs
    state = game.tick()
    if (tick === 0) state.events.seed = eventSeed(run.seed)
    observer.frame(state, tick)
    const commands = replay
      ? takeQueued(queued, tick)
      : scriptedCrewCommands(run.crew, state, seat.id, tick).map((command) => ({ tick, seat: seat.id, command }))
    for (const input of commands) {
      seat.dispatch(input.command)
      if (!replay) inputs.push(input)
    }
  }
  return { run, ticks: totalTicks, inputs, burningAtEnd: burningHotspots(state?.events.fire).length }
}

function takeQueued(queue: RecordedInput[], tick: number) {
  const taken: RecordedInput[] = []
  while (queue.length && queue[0].tick === tick) taken.push(queue.shift()!)
  return taken
}

export function islandHours(ticks: number) {
  return ticks * tickSeconds / daySeconds * hoursPerDay
}
