import { scenarioCatalog } from '../scenarios/catalog.ts'
import { crewPolicies, type CrewPolicy } from './crew-policy.ts'

// Command-line settings for `npm run sim`. Validation lives here so tests cover the same rules the CLI uses.
const defaultDays = 1
const maximumDays = 60
const maximumSeed = 2147483647
const maximumSeedCount = 10000
const rangePattern = /^(\d+)\.\.(\d+)$/

interface SimOptions {
  scenario: string
  days: number
  seeds: number[]
  crew: CrewPolicy
  out?: string
  replay?: string
  workers?: number
}

export const simUsage = 'Usage: npm run sim -- --scenario <checkpoint> [--days N] [--seeds 1..100|1,4,9] [--crew idle|scripted] [--out dir] [--workers N]\n'
  + '       npm run sim -- --replay sims/<scenario>/recording.json'

function readSeeds(text: string) {
  const range = rangePattern.exec(text)
  const seeds = range
    ? Array.from({ length: Number(range[2]) - Number(range[1]) + 1 }, (_, i) => Number(range[1]) + i)
    : text.split(',').map((part) => part.trim() === '' ? Number.NaN : Number(part))
  if (!seeds.length || seeds.length > maximumSeedCount || !seeds.every((seed) => Number.isInteger(seed) && seed >= 0 && seed <= maximumSeed)) {
    throw new Error(`Seeds must be whole numbers from 0 to ${maximumSeed}, as a range such as 1..100 or a list such as 1,4,9, at most ${maximumSeedCount}.`)
  }
  if (new Set(seeds).size !== seeds.length) throw new Error('Each seed may appear once.')
  return seeds
}

function readPositive(text: string | undefined, name: string, fallback: number, maximum: number) {
  if (text === undefined) return fallback
  const value = Number(text)
  if (!Number.isFinite(value) || value <= 0 || value > maximum) throw new Error(`--${name} must be above 0 and at most ${maximum}.`)
  return value
}

export function readSimOptions(values: Record<string, string | boolean | undefined>): SimOptions {
  const text = (key: string) => typeof values[key] === 'string' ? values[key] : undefined
  const replay = text('replay')
  const scenario = text('scenario')
  if (!replay && !scenarioCatalog.some(({ id }) => id === scenario)) {
    throw new Error(`Choose --scenario from: ${scenarioCatalog.map(({ id }) => id).join(', ')}`)
  }
  const crew = text('crew') ?? 'idle'
  if (!crewPolicies.includes(crew as CrewPolicy)) throw new Error(`--crew must be one of ${crewPolicies.join(', ')}.`)
  const workers = text('workers')
  return {
    scenario: scenario ?? '',
    days: readPositive(text('days'), 'days', defaultDays, maximumDays),
    seeds: readSeeds(text('seeds') ?? '1'),
    crew: crew as CrewPolicy,
    ...(text('out') && { out: text('out') }),
    ...(replay && { replay }),
    ...(workers && { workers: Math.round(readPositive(workers, 'workers', 1, maximumSeedCount)) }),
  }
}
