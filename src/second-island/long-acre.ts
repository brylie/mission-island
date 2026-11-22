import { longAcreFlowerOffsets as flowerOffsets } from '../assets/geometry/long-acre-flowers.ts'
import { longAcreForagers as foragers } from '../assets/recipes/long-acre-foragers.ts'
import { smoothstep as ease } from '../math/smoothstep.ts'
import type { Weather } from '../protocol.ts'
import { daySeconds } from '../weather.ts'
import type { MapPoint } from './sites.ts'

import {
  longAcreApiary as apiary,
  longAcreFlowerBeds as flowerBeds,
  longAcreHiveEntrances as hiveEntrances,
  longAcreHoneyStops as honeyStops,
} from '../worlds/saltwind/layout/scenery.ts'

export const longAcreSubject = 'long-acre-pollinators'
export { apiary, flowerBeds, flowerOffsets, hiveEntrances, honeyStops }

interface Place extends MapPoint { height: number }
interface Bee extends Place {
  activity: 'flight' | 'feeding' | 'landing' | 'resting'
  yaw: number
  bed: number
  flower: number
  hivebound: boolean
}
type Phase = 'Foraging' | 'Sheltering' | 'Returning'

const rainThreshold = 0.32
const recoveryWindow = 14
const foragingStartHour = 7
const foragingEndHour = 18
const weatherSampleSeconds = 0.25
const weatherRefinementSteps = 7
const half = 0.5

export const beeCount = foragers.length
export const beeHiveFlightHeight = 0.54
const flowerLandingRise = 0.031
const hiveLaneSpacing = 0.11
const boardForward = 0.046
const chamberInset = 0.135

const foragerDrift = 0.26
const foragerDriftFrequency = 2.4
const foragerDriftPhase = 1
const travelDrift = 0.11
const travelDriftFrequency = 7
const travelDriftPhaseStep = 2
const verticalFlutter = 0.08
const verticalFlutterFrequency = 11
const flowerYawStep = 1.51

const hiveCrawlSeconds = 0.64
const outboundSeconds = 2.3
const crossingSeconds = 2
const inboundSeconds = 2.7
const crawlsPerTrip = 2
const bedAlternationPeriod = 2
const flowerAdvancePerTrip = 2
const secondFlowerOffset = 3
const defaultFlightLift = 0.72
const flightLiftLevels = 3
const flightLiftStep = 0.18

const retreatBaseSeconds = 1.45
const retreatPaceSeconds = 0.65
const shelteredFlightLift = 0.44
const restartBaseDelay = 0.7
const restartBeeDelay = 0.64
const restartHiveStayFraction = 0.19
const restartOutboundSeconds = 2.05
const restartFlightLift = 0.5
const shelteredCloverBed = 0
const shelteredFeedingBonus = 1.1
const rejoinSeconds = 2.6
const honeyActionReach = 2

const wrap = (n: number, period: number) => ((n % period) + period) % period

function blossom(bed: number, flower: number): Place {
  const offset = flowerOffsets[flower], place = flowerBeds[bed]
  return { x: place.x + offset.x, z: place.z + offset.z, height: offset.height + flowerLandingRise }
}

function hivePath(index: number) {
  const entrance = hiveEntrances[index % hiveEntrances.length]
  const x = entrance.x + (Math.floor(index / hiveEntrances.length) - 1) * hiveLaneSpacing
  return {
    board: { x, z: entrance.z + boardForward, height: beeHiveFlightHeight },
    inside: { x, z: entrance.z - chamberInset, height: beeHiveFlightHeight },
  }
}

function move(from: Place, to: Place, t: number, activity: Bee['activity'], hivebound = false): Bee {
  return {
    x: from.x + (to.x - from.x) * t,
    z: from.z + (to.z - from.z) * t,
    height: from.height + (to.height - from.height) * t,
    activity,
    yaw: Math.atan2(to.x - from.x, to.z - from.z),
    bed: -1,
    flower: -1,
    hivebound,
  }
}

function fly(from: Place, to: Place, progress: number, index: number, lift: number, hivebound = false): Bee {
  const t = ease(progress)
  const bee = move(from, to, t, 'flight', hivebound)
  const arc = Math.sin(t * Math.PI)
  const drift = arc * (foragerDrift * Math.sin(index * foragerDriftFrequency + foragerDriftPhase) + travelDrift * Math.sin(t * travelDriftFrequency + index * travelDriftPhaseStep))
  bee.x += Math.cos(bee.yaw) * drift
  bee.z -= Math.sin(bee.yaw) * drift
  bee.height += arc * (lift + verticalFlutter * Math.sin(t * verticalFlutterFrequency + index))
  return bee
}

function rest(inside: Place): Bee {
  return { ...inside, activity: 'resting', yaw: 0, bed: -1, flower: -1, hivebound: false }
}

function land(bed: number, flower: number): Bee {
  return { ...blossom(bed, flower), activity: 'feeding', bed, flower, yaw: flower * flowerYawStep, hivebound: false }
}

function forage(time: number, index: number): Bee {
  const { offset, pace, firstFeed, secondFeed, hiveStay } = foragers[index]
  const { inside, board } = hivePath(index)
  const crawl = hiveCrawlSeconds * pace, outbound = outboundSeconds * pace, crossing = crossingSeconds * pace, inbound = inboundSeconds * pace
  const period = crawlsPerTrip * crawl + outbound + firstFeed + crossing + secondFeed + inbound + hiveStay
  const trip = Math.floor((time + offset) / period)
  // Choose the flowers at departure so a change of island day can't redirect a bee mid-flight.
  const day = Math.floor((trip * period - offset) / daySeconds)
  const firstBed = wrap(trip + day + index, flowerBeds.length)
  const secondBed = wrap(firstBed + 1 + wrap(trip + index, bedAlternationPeriod), flowerBeds.length)
  const firstFlower = wrap(flowerAdvancePerTrip * trip + day + index, flowerOffsets.length)
  const secondFlower = wrap(firstFlower + secondFlowerOffset, flowerOffsets.length)
  const first = blossom(firstBed, firstFlower), second = blossom(secondBed, secondFlower)
  const lift = defaultFlightLift + (index % flightLiftLevels) * flightLiftStep
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
  for (let age = weatherSampleSeconds; age < recoveryWindow; age += weatherSampleSeconds) {
    if ((rainAt(time - age) >= rainThreshold) === wet) continue
    let recent = age - weatherSampleSeconds, earlier = age
    for (let i = 0; i < weatherRefinementSteps; i++) {
      const middle = (recent + earlier) * half
      if ((rainAt(time - middle) >= rainThreshold) === wet) recent = middle
      else earlier = middle
    }
    return (recent + earlier) * half
  }
  return recoveryWindow
}

export function pollinatorsAt(time: number, weather: Weather, rainAt: (time: number) => number) {
  const wet = weather.rain >= rainThreshold
  const daylight = weather.hour >= foragingStartHour && weather.hour < foragingEndHour
  const age = daylight ? secondsInWeather(time, wet, rainAt) : recoveryWindow
  const phase: Phase = !daylight || wet ? 'Sheltering' : age < recoveryWindow ? 'Returning' : 'Foraging'
  const bees = foragers.map(({ pace, firstFeed, hiveStay }, i): Bee => {
    const { inside, board } = hivePath(i)
    const crawl = hiveCrawlSeconds * pace
    if (phase === 'Sheltering') {
      const retreat = retreatBaseSeconds + pace * retreatPaceSeconds
      if (!daylight || age >= retreat + crawl) return rest(inside)
      const start = forage(time - age, i)
      if (start.activity === 'resting') return start
      if (age < retreat) return fly(start, board, age / retreat, i, shelteredFlightLift, true)
      return move(board, inside, ease((age - retreat) / crawl), 'landing', true)
    }
    if (phase === 'Foraging') return forage(time, i)
    const recovery = age - restartBaseDelay - i * restartBeeDelay - hiveStay * restartHiveStayFraction
    if (recovery <= 0) return rest(inside)
    if (recovery < crawl) return move(inside, board, ease(recovery / crawl), 'landing')
    const clover = blossom(shelteredCloverBed, i), outbound = restartOutboundSeconds * pace
    if (recovery < crawl + outbound) return fly(board, clover, (recovery - crawl) / outbound, i, restartFlightLift)
    const cloverDone = crawl + outbound + firstFeed + shelteredFeedingBonus
    if (recovery < cloverDone) return land(shelteredCloverBed, i)
    const rejoin = (recovery - cloverDone) / rejoinSeconds
    const route = forage(time, i)
    if (rejoin >= 1) return route
    return fly(clover, route, rejoin, i, shelteredFlightLift, route.hivebound || route.activity === 'resting')
  })
  return { phase, bees }
}

export const honeyReward = 4
export type HoneyOrder = 'kit' | 'empty' | 'filled' | 'delivered'

export function honeyAction(order: HoneyOrder, at: MapPoint) {
  if (order === 'delivered') return
  const target = honeyStops[order === 'kit' ? 'kit' : order === 'empty' ? 'extractor' : 'market']
  if (Math.hypot(at.x - target.x, at.z - target.z) > honeyActionReach) return
  if (order === 'kit') return { label: 'Borrow veil and take a jar', next: 'empty' } as const
  if (order === 'empty') return { label: 'Fill and cap one jar', next: 'filled' } as const
  return { label: 'Hand in the honey', next: 'delivered' } as const
}
