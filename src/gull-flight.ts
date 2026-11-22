import { harborGullCircuit, harborGullFlightStyle } from './assets/recipes/harbor-gull-flight.ts'
import type { Weather } from './protocol.ts'
import { smoothRange } from './wildlife-motion.ts'
import type { Point } from './world.ts'

type Position = Point & { y: number }
export interface GullPerch extends Position { heading: number }
type GullPhase = 'Resting' | 'Settling' | (typeof harborGullCircuit)[number]['phase']
type ControlPoints = (typeof harborGullCircuit)[number]['controlPoints']

const cycleBaseS = 48
const timingGroups = 3
const cycleStaggerS = 1.6
const cycleOffsetPerBirdS = 2.37
const alternatingOffsetS = 1.41
const alternatingBands = 2
const daylightStartHour = 6
const daylightEndHour = 19.25
const fairFlightStartHour = 7
const fairFlightEndHour = 17.5
const shelteredRainThreshold = 0.65
const shelteredLaunchS = 13.4
const shelteredLaunchStaggerS = 0.29
const fairLaunchS = 3.1
const fairLaunchStaggerS = 0.32
const shelteredArrivalS = 38.2
const fairArrivalS = 37.8
const arrivalStaggerS = 0.59
const settleDurationS = 0.56
const unfoldingDurationS = 0.85
const landingCrouchM = 0.047
const shelteredCircuitScale = 0.72
const circuitReachVariation = 0.065
const sidewaysAxis = 0
const verticalAxis = 1
const forwardAxis = 2
const cubicPower = 3
const middleTermWeight = 3
const middleTangentWeight = 2

const { pathEasing, bank: bankStyle, pitch: pitchStyle, flare, wingbeat, tuck: tuckStyle, sweep: sweepStyle, separation: separationStyle } = harborGullFlightStyle

export function gullsSeekShelter(weather: Weather) {
  return weather.rain >= shelteredRainThreshold || weather.hour < fairFlightStartHour || weather.hour >= fairFlightEndHour
}

export function gullCycle(index: number) {
  return {
    period: cycleBaseS + index % timingGroups * cycleStaggerS,
    offset: index * cycleOffsetPerBirdS + (index % alternatingBands) * alternatingOffsetS,
  }
}

function positionAt([a, b, c, d]: ControlPoints, t: number, axis: number) {
  const s = 1 - t
  return a[axis] * s ** cubicPower + middleTermWeight * b[axis] * s * s * t
    + middleTermWeight * c[axis] * s * t * t + d[axis] * t ** cubicPower
}

function tangentAt([a, b, c, d]: ControlPoints, t: number, axis: number) {
  const s = 1 - t
  return (b[axis] - a[axis]) * s * s + middleTangentWeight * (c[axis] - b[axis]) * s * t + (d[axis] - c[axis]) * t * t
}

export function gullAt(time: number, index: number, perch: GullPerch, weather: Weather, weatherAt?: (time: number) => Weather) {
  const { period, offset } = gullCycle(index)
  const start = Math.floor((time + offset) / period) * period - offset
  const age = time - start
  // A launched gull finishes its circuit. Only the next departure reads new weather.
  const sky = weatherAt?.(start) ?? weather
  const dark = sky.hour < daylightStartHour || sky.hour >= daylightEndHour
  const sheltered = gullsSeekShelter(sky)
  const group = index % timingGroups
  const launch = sheltered ? shelteredLaunchS + group * shelteredLaunchStaggerS : fairLaunchS + group * fairLaunchStaggerS
  const arrival = (sheltered ? shelteredArrivalS : fairArrivalS) + group * arrivalStaggerS
  if (dark || age < launch || age >= arrival) {
    const after = age - arrival
    const settling = !dark && after >= 0 && after < settleDurationS
    const fold = dark
      ? 1
      : age >= arrival ? smoothRange(0, settleDurationS, after) : 1 - smoothRange(launch - unfoldingDurationS, launch, age)
    const phase: GullPhase = settling ? 'Settling' : 'Resting'
    const crouch = settling ? landingCrouchM * Math.sin(after / settleDurationS * Math.PI) : 0
    return { ...perch, phase, grounded: true, fold, sweep: 0, flap: 0, bank: 0, pitch: 0, tuck: 0, crouch }
  }

  const progress = (age - launch) / (arrival - launch)
  const leg = harborGullCircuit.findIndex(({ end }) => progress <= end)
  const { controlPoints, end, phase } = harborGullCircuit[leg]
  const from = harborGullCircuit[leg - 1]?.end ?? 0
  const u = (progress - from) / (end - from)
  const t = phase === 'Push-off' ? u ** pathEasing.pushOffPower : phase === 'Flare' ? 1 - (1 - u) ** pathEasing.flarePower : u
  const vertical = sheltered ? shelteredCircuitScale : 1
  const reach = vertical * (1 + (group - 1) * circuitReachVariation)
  const x = positionAt(controlPoints, t, sidewaysAxis) * reach
  const z = positionAt(controlPoints, t, forwardAxis) * reach
  const tx = tangentAt(controlPoints, t, sidewaysAxis), tz = tangentAt(controlPoints, t, forwardAxis)
  const heading = Math.atan2(tx, tz)
  const next = Math.min(1, t + bankStyle.tangentLookAhead)
  const nx = tangentAt(controlPoints, next, sidewaysAxis), nz = tangentAt(controlPoints, next, forwardAxis)
  const turn = Math.atan2(nx * tz - nz * tx, nx * tx + nz * tz)
  const bank = Math.max(-bankStyle.limitRad, Math.min(bankStyle.limitRad, -turn * bankStyle.gain))
    * (1 - smoothRange(bankStyle.levelFrom, 1, progress))
  const pitch = Math.max(pitchStyle.minRad, Math.min(pitchStyle.maxRad, -Math.atan2(tangentAt(controlPoints, t, verticalAxis) * vertical, Math.hypot(tx, tz) * reach)))
    - flare.pitchRad * smoothRange(flare.riseFrom, flare.riseTo, progress) * (1 - smoothRange(flare.levelFrom, 1, progress))
  const beats = wingbeat.glideWeight + wingbeat.climbWeight * (1 - smoothRange(wingbeat.climbFadeFrom, wingbeat.climbFadeTo, progress))
  const flap = Math.sin((time - launch + offset) * wingbeat.speedRadPerSecond) * wingbeat.amplitudeRad * beats
    * smoothRange(0, wingbeat.engageTo, progress)
  const tuck = smoothRange(tuckStyle.raiseFrom, tuckStyle.raiseTo, progress) * (1 - smoothRange(tuckStyle.lowerFrom, tuckStyle.lowerTo, progress))
  const sweep = sweepStyle.glideRad * (1 - beats) + sweepStyle.landingRad * smoothRange(sweepStyle.landingFrom, sweepStyle.landingTo, progress)
  const separation = index * separationStyle.metersPerBird * smoothRange(separationStyle.riseFrom, separationStyle.riseTo, progress)
    * (1 - smoothRange(separationStyle.fallFrom, separationStyle.fallTo, progress))
  const sin = Math.sin(perch.heading), cos = Math.cos(perch.heading)
  return {
    x: perch.x + x * cos + z * sin,
    y: perch.y + positionAt(controlPoints, t, verticalAxis) * vertical + separation,
    z: perch.z - x * sin + z * cos,
    heading: perch.heading + heading,
    phase,
    grounded: false,
    fold: 0,
    flap,
    bank,
    pitch,
    tuck,
    crouch: 0,
    sweep,
  }
}
