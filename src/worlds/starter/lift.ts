import { farm } from '../../farm.ts'
import { lookout, town } from '../../world.ts'
import type { Point } from '../../world.ts'
import { starterLiftSites } from './layout/sites.ts'
import { ridgeUpdraft } from './ridge-scout.ts'

// Where rising air lets a hang glider climb on Starter Island. The training wind blows in
// from the southeast, so it lifts over slopes that face it. On a sunny day, dark soil,
// rooftops and bare rock warm faster than the grass around them and send up thermals.
// Rain and night shut the thermals down. Ridge lift needs only the wind.
export type LiftKind = 'ridge' | 'thermal'

export interface LiftSite extends Point {
  id: string
  name: string
  kind: LiftKind
  radius: number
  // Metres above the ground below the site where the lift fades out.
  ceiling: number
  // Vertical air speed at the centre, in m/s, before daylight and rain scale a thermal.
  lift: number
}

const thermalStartHour = 6.5
const thermalHours = 13
const thermalWarmUpExponent = 0.5
const maximumRainCooling = 0.8

function relativeSite(site: LiftSite, at: Point): LiftSite {
  return { ...site, x: at.x + site.x, z: at.z + site.z }
}

export const liftSites: readonly LiftSite[] = [
  { id: 'windstone-shoulder', name: 'Windstone shoulder', kind: 'ridge', ...ridgeUpdraft },
  { ...starterLiftSites.fernfall },
  { ...starterLiftSites.juniper },
  relativeSite(starterLiftSites.lookout, lookout),
  relativeSite(starterLiftSites.town, town),
  relativeSite(starterLiftSites.farm, farm),
]

// Thermals build through the morning, peak after noon and fade before dusk. Rain cools the ground.
export function thermalStrength(hour: number, rain: number) {
  const sun = Math.sin(Math.PI * (hour - thermalStartHour) / thermalHours)
  return Math.max(0, sun) ** thermalWarmUpExponent * (1 - maximumRainCooling * Math.min(1, Math.max(0, rain)))
}

export function liftStrength(site: LiftSite, hour: number, rain: number) {
  return site.kind === 'ridge' ? 1 : thermalStrength(hour, rain)
}
