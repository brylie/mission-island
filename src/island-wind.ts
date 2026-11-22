import { daySeconds } from './weather.ts'
import { ridgeWind } from './worlds/starter/ridge-scout.ts'

// The island's wind blows toward this heading on average: the same breeze the glider feels on Windstone Ridge.
const prevailingHeading = Math.atan2(ridgeWind.x, ridgeWind.z)
// Over a few days the wind veers either side of the prevailing direction and freshens or eases.
const veerRadians = 0.6
const veerPeriodDays = 3.7
const veerPhase = 1.3
const calmestStrength = 0.35
const strengthRange = 0.65
const strengthPeriodDays = 2.3
const fullTurn = Math.PI + Math.PI
const half = 0.5

interface IslandWind {
  // Heading the wind blows toward, measured like a pose heading: 0 is +z (north), π/2 is +x (east).
  heading: number
  // From 0 (calm) to 1 (fresh).
  strength: number
  x: number
  z: number
}

// A pure function of island time, so the host and every client agree without sending it.
export function windAt(islandTime: number): IslandWind {
  const day = islandTime / daySeconds
  const heading = prevailingHeading + veerRadians * Math.sin(day * fullTurn / veerPeriodDays + veerPhase)
  const strength = calmestStrength + strengthRange * (half + half * Math.sin(day * fullTurn / strengthPeriodDays))
  return { heading, strength, x: Math.sin(heading) * strength, z: Math.cos(heading) * strength }
}
