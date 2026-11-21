import { farm } from '../../farm.ts'
import { lookout, town } from '../../world.ts'
import type { Point } from '../../world.ts'
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

export const liftSites: readonly LiftSite[] = [
  { id: 'windstone-shoulder', name: 'Windstone shoulder', kind: 'ridge', ...ridgeUpdraft },
  { id: 'fernfall-ledges', name: 'Fernfall ledges', kind: 'thermal', x: 17, z: 93, radius: 8, ceiling: 32, lift: 7 },
  { id: 'juniper-slope', name: 'Juniper slope', kind: 'ridge', x: -38, z: 62, radius: 9, ceiling: 30, lift: 8 },
  { id: 'lookout-clearing', name: 'Lookout clearing', kind: 'thermal', x: lookout.x + 4, z: lookout.z - 3, radius: 8, ceiling: 30, lift: 7 },
  { id: 'seabrook-roofs', name: 'Seabrook rooftops', kind: 'thermal', x: town.x - 4, z: town.z + 4, radius: 8.5, ceiling: 30, lift: 7 },
  { id: 'farm-fields', name: 'Island Farm fields', kind: 'thermal', x: farm.x + 3, z: farm.z + 2, radius: 8, ceiling: 28, lift: 7 },
]

// Thermals build through the morning, peak after noon and fade before dusk. Rain cools the ground.
export function thermalStrength(hour: number, rain: number) {
  const sun = Math.sin(Math.PI * (hour - 6.5) / 13)
  return Math.max(0, sun) ** 0.5 * (1 - 0.8 * Math.min(1, Math.max(0, rain)))
}

export function liftStrength(site: LiftSite, hour: number, rain: number) {
  return site.kind === 'ridge' ? 1 : thermalStrength(hour, rain)
}
