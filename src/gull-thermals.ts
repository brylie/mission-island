import { gullsSeekShelter } from './gull-flight.ts'
import type { Weather } from './protocol.ts'
import { groundHeight } from './terrain.ts'
import { smoothRange } from './wildlife-motion.ts'
import { liftStrength, type LiftSite } from './worlds/starter/lift.ts'

// Gulls ride rising air with their wings held still, circling to stay in the lift and drifting
// wider as they glide down to find it again. Weak thermals hold fewer gulls and lower ceilings.
const weakLiftMinimum = 0.3
const strongerLiftMinimum = 0.6
const liftThresholds = [weakLiftMinimum, strongerLiftMinimum] as const
export const gullsPerLift = liftThresholds.length

const shortestPeriodS = 64
const sitePeriodStrideS = 7
const birdPeriodStrideS = 11
const periodRangeS = 17
const sitePhaseOffsetS = 13.7
const birdPhaseOffsetS = 29.3

const minimumHeightM = 5
const ceilingClearanceM = 4
const minimumCeilingFraction = 0.35
const flightSpeedMps = 5.2
const fullTurn = Math.PI + Math.PI
const half = 0.5
const turnAlternation = 2
const coreRadiusRatio = 0.55
const radiusSpacingRatio = 0.08
const glideWideningRatio = 0.3
const turnBankRad = 0.26
const glideBankReduction = 0.3
const minimumPitchRad = -0.2
const maximumPitchRad = 0.15
const sweepRad = 0.13
const trimCyclesPerCircuit = 3
const birdTrimPhase = 0.37
const trimStart = 0.93
const trimPeak = 0.97
const wingbeatRadPerSecond = 11.2
const trimFlapRad = 0.45

function thermalGullCycle(site: number, index: number) {
  return {
    period: shortestPeriodS + (site * sitePeriodStrideS + index * birdPeriodStrideS) % periodRangeS,
    offset: site * sitePhaseOffsetS + index * birdPhaseOffsetS,
  }
}

// Each gull joins a circuit at the top of the climb, away from the ground and nearby pilots.
export function thermalGullAt(time: number, siteIndex: number, site: LiftSite, index: number, weather: Weather, weatherAt?: (time: number) => Weather) {
  const { period, offset } = thermalGullCycle(siteIndex, index)
  const start = Math.floor((time + offset) / period) * period - offset
  const sky = weatherAt?.(start) ?? weather
  if (gullsSeekShelter(sky) || liftStrength(site, sky.hour, sky.rain) < liftThresholds[index]) return null
  const strength = Math.min(1, liftStrength(site, weather.hour, weather.rain))
  const top = minimumHeightM + (site.ceiling - ceilingClearanceM - minimumHeightM) * Math.max(minimumCeilingFraction, strength)
  const age = (time - start) / period
  const cycleAngle = fullTurn * age
  const climb = Math.sin(cycleAngle)
  // The cycle starts at the top: glide down and wide, then climb tight in the core.
  const height = minimumHeightM + (top - minimumHeightM) * (half + half * Math.cos(cycleAngle))
  const coreRadius = site.radius * (coreRadiusRatio + radiusSpacingRatio * index)
  const radius = coreRadius * (1 + glideWideningRatio * climb)
  // Birds sharing the same column circle in the same direction.
  const turn = siteIndex % turnAlternation ? 1 : -1
  const angle = turn * flightSpeedMps * time / coreRadius + index * Math.PI + siteIndex
  const x = site.x + radius * Math.cos(angle), z = site.z + radius * Math.sin(angle)
  const heading = Math.atan2(-turn * Math.sin(angle), turn * Math.cos(angle))
  const rise = -(top - minimumHeightM) * Math.PI * climb / period
  // A few wingbeats now and then to tidy a turn. Soaring gulls rarely flap.
  const trimPhase = (age * trimCyclesPerCircuit + index * birdTrimPhase) % 1
  const beat = smoothRange(trimStart, trimPeak, trimPhase) * (1 - smoothRange(trimPeak, 1, trimPhase))
  return {
    x,
    y: groundHeight(site) + height,
    z,
    heading,
    phase: 'Glide' as const,
    grounded: false,
    fold: 0,
    flap: Math.sin(time * wingbeatRadPerSecond) * trimFlapRad * beat,
    bank: turnBankRad * turn * (1 - glideBankReduction * Math.max(0, -climb)),
    pitch: Math.max(minimumPitchRad, Math.min(maximumPitchRad, -Math.atan2(rise, flightSpeedMps))),
    tuck: 1,
    crouch: 0,
    sweep: sweepRad,
  }
}
