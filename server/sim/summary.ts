import type { SimEvent, SimResult } from './runner.ts'
import { islandHours } from './runner.ts'
import { daySeconds, hoursPerDay } from '../../src/weather.ts'
import { tickSeconds } from '../game.ts'

const tenthQuantile = 0.1
const medianQuantile = 0.5
const ninetiethQuantile = 0.9
const summaryDecimals = 3
const ticksPerHour = daySeconds / hoursPerDay / tickSeconds

interface SeedSummary {
  seed: number
  firesStarted: number
  spreads: number
  located: number
  extinguished: number
  burnedOut: number
  rainedOut: number
  hoursToLocate: number[]
  fireHours: number[]
  regrowthStages: Record<string, number>
  animalChanges: number
  weatherChanges: number
  burningAtEnd: number
}

// One seed's events folded into the numbers a balance pass compares.
export function summarizeSeed(result: SimResult, events: readonly SimEvent[]): SeedSummary {
  const count = (type: string) => events.filter((event) => event.type === type).length
  const started = new Map<unknown, number>()
  const hoursToLocate: number[] = [], fireHours: number[] = []
  const regrowthStages: Record<string, number> = {}
  for (const event of events) {
    if (event.type === 'fire-started') started.set(event.fire, event.tick)
    const from = started.get(event.fire)
    if (event.type === 'fire-located' && from !== undefined) hoursToLocate.push((event.tick - from) / ticksPerHour)
    if (['fire-out', 'fire-burned-out', 'fire-rained-out'].includes(event.type) && from !== undefined) fireHours.push((event.tick - from) / ticksPerHour)
    if (event.type === 'regrowth') regrowthStages[String(event.stage)] = (regrowthStages[String(event.stage)] ?? 0) + 1
  }
  return {
    seed: result.run.seed,
    firesStarted: count('fire-started'),
    spreads: count('fire-spread'),
    located: count('fire-located'),
    extinguished: count('fire-out'),
    burnedOut: count('fire-burned-out'),
    rainedOut: count('fire-rained-out'),
    hoursToLocate,
    fireHours,
    regrowthStages,
    animalChanges: count('animal'),
    weatherChanges: count('weather'),
    burningAtEnd: result.burningAtEnd,
  }
}

function quantile(sorted: readonly number[], share: number) {
  return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]
}

function distribution(values: readonly number[]) {
  if (!values.length) return { count: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const round = (value: number) => Number(value.toFixed(summaryDecimals))
  return {
    count: sorted.length,
    min: round(sorted[0]),
    p10: round(quantile(sorted, tenthQuantile)),
    median: round(quantile(sorted, medianQuantile)),
    mean: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    p90: round(quantile(sorted, ninetiethQuantile)),
    max: round(sorted.at(-1)!),
  }
}

type NumericKey = { [K in keyof SeedSummary]: SeedSummary[K] extends number ? K : never }[keyof SeedSummary]
const perSeedTotals: NumericKey[] = ['firesStarted', 'spreads', 'located', 'extinguished', 'burnedOut', 'rainedOut', 'animalChanges', 'weatherChanges', 'burningAtEnd']

// Distributions across every seed: per-seed totals, then pooled per-fire timings.
export function summarizeSweep(seeds: readonly SeedSummary[], ticks: number) {
  const stages = new Set(seeds.flatMap((seed) => Object.keys(seed.regrowthStages)))
  return {
    seeds: seeds.length,
    islandHoursPerSeed: Number(islandHours(ticks).toFixed(summaryDecimals)),
    perSeed: Object.fromEntries(perSeedTotals.map((key) => [key, distribution(seeds.map((seed) => seed[key]))])),
    perFire: {
      hoursToLocate: distribution(seeds.flatMap((seed) => seed.hoursToLocate)),
      fireHours: distribution(seeds.flatMap((seed) => seed.fireHours)),
    },
    regrowthStages: Object.fromEntries([...stages].sort().map((stage) => [stage, distribution(seeds.map((seed) => seed.regrowthStages[stage] ?? 0))])),
  }
}
