import type { Weather } from '../protocol.ts'
import { daySeconds } from '../weather.ts'
import type { MapPoint } from './sites.ts'

export const longAcreSubject = 'long-acre-pollinators'
export const apiary = { x: 181.4, z: 25.8 }
export const flowerBeds = [
  { x: 179.1, z: 25.9, name: 'Sheltered clover', petals: '#f2d7bd' },
  { x: 182.6, z: 28.1, name: 'Sunlit trefoil', petals: '#efbb51' },
  { x: 179.3, z: 29.3, name: 'Phacelia by the barrels', petals: '#b394d1' },
] as const
export const flowerOffsets = [
  { x: -.62, z: -.23, height: .48 }, { x: .52, z: -.36, height: .59 },
  { x: -.08, z: .35, height: .54 }, { x: .36, z: .55, height: .46 },
  { x: -.53, z: .47, height: .62 }, { x: .05, z: -.62, height: .54 },
] as const
export const hiveEntrances = [{ x: 179.0, z: 23.15 }, { x: 181, z: 23.15 }] as const

interface Place extends MapPoint { height: number }
interface Bee extends Place {
  activity: 'flight' | 'feeding' | 'resting'
  yaw: number
  bed: number
  flower: number
}
type Phase = 'Foraging' | 'Sheltering' | 'Returning'
const rainThreshold = .32
const recoveryWindow = 14
const beeCount = 6
const wrap = (n: number, period: number) => ((n % period) + period) % period
const clamp = (n: number) => Math.max(0, Math.min(1, n))
const ease = (n: number) => { const u = clamp(n); return u * u * (3 - 2 * u) }

function blossom(bed: number, flower: number): Place {
  const offset = flowerOffsets[flower], place = flowerBeds[bed]
  return { x: place.x + offset.x, z: place.z + offset.z, height: offset.height + .031 }
}

function shelter(index: number): Place {
  const entrance = hiveEntrances[index % 2]
  return { x: entrance.x + (Math.floor(index / 2) - 1) * .11, z: entrance.z + .018, height: .54 }
}

function fly(from: Place, to: Place, progress: number, lift: number): Bee {
  const t = ease(progress)
  return {
    x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t,
    height: from.height + (to.height - from.height) * t + Math.sin(t * Math.PI) * lift,
    activity: 'flight', yaw: Math.atan2(to.x - from.x, to.z - from.z), bed: -1, flower: -1,
  }
}

function land(bed: number, flower: number): Bee {
  return { ...blossom(bed, flower), activity: 'feeding', bed, flower, yaw: flower * 1.51 }
}

function forage(time: number, index: number): Bee {
  const day = Math.floor(time / daySeconds)
  const period = 7.8 + (index % 3) * .31
  const clock = time + (index % 3) * 1.27
  const turn = Math.floor(clock / period) * (day % 2 ? -1 : 1) + day + (index % 2)
  const previous = wrap(turn - (day % 2 ? -1 : 1), flowerBeds.length)
  const bed = wrap(turn, flowerBeds.length)
  const flower = wrap(index + Math.floor(clock / period), flowerOffsets.length)
  const slice = wrap(clock, period)
  if (slice < 2.9) return fly(blossom(previous, wrap(flower - 1, flowerOffsets.length)),
    blossom(bed, flower), slice / 2.9, .64 + (index % 3) * .18)
  return land(bed, flower)
}

function secondsInWeather(time: number, wet: boolean, rainAt: (time: number) => number) {
  // Probe the synchronized weather history, including sub-second transitions. No frame
  // history is required for a client that joins a shower or opens a paused study.
  const step = .25
  for (let age = step; age < recoveryWindow; age += step) {
    if ((rainAt(time - age) >= rainThreshold) !== wet) return age - step / 2
  }
  return recoveryWindow
}

export function pollinatorsAt(time: number, weather: Weather, rainAt: (time: number) => number) {
  const wet = weather.rain >= rainThreshold
  const daylight = weather.hour >= 7 && weather.hour < 18
  const age = daylight ? secondsInWeather(time, wet, rainAt) : recoveryWindow
  const phase: Phase = !daylight || wet ? 'Sheltering' : age < recoveryWindow ? 'Returning' : 'Foraging'
  const bees = Array.from({ length: beeCount }, (_, i): Bee => {
    const home = shelter(i)
    const resting = (): Bee => ({ ...home, activity: 'resting', yaw: 0, bed: -1, flower: -1 })
    if (phase === 'Sheltering') {
      return daylight && age < 2.4 ? fly(forage(time - age, i), home, age / 2.4, .45) : resting()
    }
    if (phase === 'Foraging') return forage(time, i)
    const recovery = age - .9 - i * .61
    if (recovery <= 0) return resting()
    if (recovery < 2.6) return fly(home, blossom(0, i), recovery / 2.6, .42)
    if (age > 10.5) {
      return fly(blossom(0, i), forage(time, i), (age - 10.5) / (recoveryWindow - 10.5), .44)
    }
    return land(0, i)
  })
  return { phase, bees }
}

export const honeyReward = 4
export const honeyStops = {
  kit: { x: 185.7, z: 26.4 },
  extractor: { x: 184.1, z: 22.0 },
  market: { x: 160.6, z: -39.5 },
} as const

export type HoneyOrder = 'kit' | 'empty' | 'filled' | 'delivered'

export function honeyAction(order: HoneyOrder, at: MapPoint) {
  if (order === 'delivered') return
  const target = honeyStops[order === 'kit' ? 'kit' : order === 'empty' ? 'extractor' : 'market']
  if (Math.hypot(at.x - target.x, at.z - target.z) > 2) return
  if (order === 'kit') return { label: 'Borrow veil and take a jar', next: 'empty' } as const
  if (order === 'empty') return { label: 'Fill and cap one jar', next: 'filled' } as const
  return { label: 'Hand in the honey', next: 'delivered' } as const
}
