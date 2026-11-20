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
  activity: 'flight' | 'feeding' | 'landing' | 'resting'
  yaw: number
  bed: number
  flower: number
  hivebound: boolean
}
type Phase = 'Foraging' | 'Sheltering' | 'Returning'
const rainThreshold = .32
const recoveryWindow = 14
const foragers = [
  { offset: 1.20, pace: .95, firstFeed: 3.4, secondFeed: 2.3, hiveStay: 1.8 },
  { offset: 4.45, pace: 1.11, firstFeed: 2.1, secondFeed: 3.6, hiveStay: 2.7 },
  { offset: 9.30, pace: .88, firstFeed: 3.9, secondFeed: 2.8, hiveStay: 1.2 },
  { offset: 12.75, pace: 1.19, firstFeed: 2.7, secondFeed: 1.7, hiveStay: 3.4 },
  { offset: 6.10, pace: 1.04, firstFeed: 1.8, secondFeed: 3.2, hiveStay: 2.1 },
  { offset: 15.55, pace: .98, firstFeed: 3.0, secondFeed: 2.6, hiveStay: 2.8 },
]
export const beeCount = foragers.length
const wrap = (n: number, period: number) => ((n % period) + period) % period
const clamp = (n: number) => Math.max(0, Math.min(1, n))
const ease = (n: number) => { const u = clamp(n); return u * u * (3 - 2 * u) }

function blossom(bed: number, flower: number): Place {
  const offset = flowerOffsets[flower], place = flowerBeds[bed]
  return { x: place.x + offset.x, z: place.z + offset.z, height: offset.height + .031 }
}

function hivePath(index: number) {
  const entrance = hiveEntrances[index % 2]
  const x = entrance.x + (Math.floor(index / 2) - 1) * .11
  return {
    board: { x, z: entrance.z + .046, height: .54 },
    inside: { x, z: entrance.z - .135, height: .54 },
  }
}

function move(from: Place, to: Place, t: number, activity: Bee['activity'], hivebound = false): Bee {
  return {
    x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t,
    height: from.height + (to.height - from.height) * t,
    activity, yaw: Math.atan2(to.x - from.x, to.z - from.z), bed: -1, flower: -1, hivebound,
  }
}

function fly(from: Place, to: Place, progress: number, index: number, lift: number, hivebound = false): Bee {
  const t = ease(progress)
  const bee = move(from, to, t, 'flight', hivebound)
  const arc = Math.sin(t * Math.PI)
  const drift = arc * (.26 * Math.sin(index * 2.4 + 1) + .11 * Math.sin(t * 7 + index * 2))
  bee.x += Math.cos(bee.yaw) * drift
  bee.z -= Math.sin(bee.yaw) * drift
  bee.height += arc * (lift + .08 * Math.sin(t * 11 + index))
  return bee
}

function rest(inside: Place): Bee {
  return { ...inside, activity: 'resting', yaw: 0, bed: -1, flower: -1, hivebound: false }
}

function land(bed: number, flower: number): Bee {
  return { ...blossom(bed, flower), activity: 'feeding', bed, flower, yaw: flower * 1.51, hivebound: false }
}

function forage(time: number, index: number): Bee {
  const { offset, pace, firstFeed, secondFeed, hiveStay } = foragers[index]
  const { inside, board } = hivePath(index)
  const crawl = .64 * pace, outbound = 2.3 * pace, crossing = 2 * pace, inbound = 2.7 * pace
  const period = 2 * crawl + outbound + firstFeed + crossing + secondFeed + inbound + hiveStay
  const trip = Math.floor((time + offset) / period)
  // Choose the flowers at departure so a change of island day can't redirect a bee mid-flight.
  const day = Math.floor((trip * period - offset) / daySeconds)
  const firstBed = wrap(trip + day + index, flowerBeds.length)
  const secondBed = wrap(firstBed + 1 + wrap(trip + index, 2), flowerBeds.length)
  const firstFlower = wrap(2 * trip + day + index, flowerOffsets.length)
  const secondFlower = wrap(firstFlower + 3, flowerOffsets.length)
  const first = blossom(firstBed, firstFlower), second = blossom(secondBed, secondFlower)
  const lift = .72 + (index % 3) * .18
  let age = wrap(time + offset, period)
  if (age < crawl) return move(inside, board, ease(age / crawl), 'landing')
  age -= crawl
  if (age < outbound) return fly(board, first, age / outbound, index, lift)
  age -= outbound
  if (age < firstFeed) return land(firstBed, firstFlower)
  age -= firstFeed
  if (age < crossing) return fly(first, second, age / crossing, index, lift)
  age -= crossing
  if (age < secondFeed) return land(secondBed, secondFlower)
  age -= secondFeed
  if (age < inbound) return fly(second, board, age / inbound, index, lift, true)
  age -= inbound
  if (age < crawl) return move(board, inside, ease(age / crawl), 'landing', true)
  return rest(inside)
}

function secondsInWeather(time: number, wet: boolean, rainAt: (time: number) => number) {
  // Probe the synchronized weather history, including sub-second transitions. No frame
  // history is required for a client that joins a shower or opens a paused study.
  const step = .25
  for (let age = step; age < recoveryWindow; age += step) {
    if ((rainAt(time - age) >= rainThreshold) === wet) continue
    let recent = age - step, earlier = age
    for (let i = 0; i < 7; i++) {
      const middle = (recent + earlier) / 2
      if ((rainAt(time - middle) >= rainThreshold) === wet) recent = middle
      else earlier = middle
    }
    return (recent + earlier) / 2
  }
  return recoveryWindow
}

export function pollinatorsAt(time: number, weather: Weather, rainAt: (time: number) => number) {
  const wet = weather.rain >= rainThreshold
  const daylight = weather.hour >= 7 && weather.hour < 18
  const age = daylight ? secondsInWeather(time, wet, rainAt) : recoveryWindow
  const phase: Phase = !daylight || wet ? 'Sheltering' : age < recoveryWindow ? 'Returning' : 'Foraging'
  const bees = foragers.map(({ pace, firstFeed, hiveStay }, i): Bee => {
    const { inside, board } = hivePath(i)
    const crawl = .64 * pace
    if (phase === 'Sheltering') {
      const retreat = 1.45 + pace * .65
      if (!daylight || age >= retreat + crawl) return rest(inside)
      const start = forage(time - age, i)
      if (start.activity === 'resting') return start
      if (age < retreat) return fly(start, board, age / retreat, i, .44, true)
      return move(board, inside, ease((age - retreat) / crawl), 'landing', true)
    }
    if (phase === 'Foraging') return forage(time, i)
    const recovery = age - .7 - i * .64 - hiveStay * .19
    if (recovery <= 0) return rest(inside)
    if (recovery < crawl) return move(inside, board, ease(recovery / crawl), 'landing')
    const clover = blossom(0, i), outbound = 2.05 * pace
    if (recovery < crawl + outbound) return fly(board, clover, (recovery - crawl) / outbound, i, .5)
    const cloverDone = crawl + outbound + firstFeed + 1.1
    if (recovery < cloverDone) return land(0, i)
    const rejoin = (recovery - cloverDone) / 2.6
    const route = forage(time, i)
    if (rejoin >= 1) return route
    return fly(clover, route, rejoin, i, .44, route.hivebound || route.activity === 'resting')
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
