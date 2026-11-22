import { fireFinder } from './fire-watch.ts'
import type { Item, Player, Snapshot } from './protocol.ts'
import { distance, itemStarts, type Point } from './world.ts'
import { starterFireSites } from './worlds/starter/layout/fire-sites.ts'

export type WildfireSize = 'spot' | 'patch' | 'blaze'
export type FireSiteId = typeof starterFireSites[number]['id']

export interface Hotspot extends Point {
  // Current heat from 0 (out) to 1. A hotspot that has not caught yet has never burned.
  heat: number
  peak: number
  caught: boolean
}

export interface Wildfire {
  id: number
  site: FireSiteId
  size: WildfireSize
  startedAt: number
  // Whether the crew knows where it is. Smoke is reported island-wide before anyone finds it.
  located: boolean
  hotspots: Hotspot[]
  // Seconds toward the next hotspot catching.
  spreadElapsed?: number
}

export interface FireRecord {
  id: number
  site: FireSiteId
  size: WildfireSize
  endedAt: number
  outcome: 'extinguished' | 'burned-out' | 'rained-out'
  // Indices of the site's hotspots that caught, which leave burn scars.
  burned?: number[]
}

// Island events are host-scheduled happenings. A wildfire is the first kind.
export interface IslandEvents {
  seed: number
  nextFireAt: number | null
  fire: Wildfire | null
  lastFire?: FireRecord
  firesOut: number
}

const spotHotspots = 1
const patchHotspots = 3
const blazeHotspots = 5
const spotCoins = 3
const patchCoins = 6
const blazeCoins = 10

export const wildfireSizes = {
  spot: { label: 'Spot fire', hotspots: spotHotspots, coins: spotCoins },
  patch: { label: 'Grass fire', hotspots: patchHotspots, coins: patchCoins },
  blaze: { label: 'Brush blaze', hotspots: blazeHotspots, coins: blazeCoins },
} as const satisfies Record<WildfireSize, { label: string, hotspots: number, coins: number }>

const wildfireSprayReach = 5
// A crewmate on the ground finds a fire only when this close. The fire finder is the quick way.
export const fireSightRangeM = 8
const fireFinderReachM = 1.6
const fullTurnDegrees = 360
const compassPoints = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const
const compassSector = fullTurnDegrees / compassPoints.length
const half = 0.5
const halfSector = compassSector * half
const metresPerHundred = 10
const homeReachM = 1.4

export function fireSite(id: FireSiteId) {
  return starterFireSites.find((site) => site.id === id) ?? starterFireSites[0]
}

export function burningHotspots(fire: Wildfire | null | undefined) {
  return fire?.hotspots.filter((spot) => spot.heat > 0) ?? []
}

// The fire's centre of heat, or its site before anything has caught.
export function fireCentre(fire: Wildfire): Point {
  const lit = burningHotspots(fire)
  if (!lit.length) return fireSite(fire.site)
  return { x: lit.reduce((sum, spot) => sum + spot.x, 0) / lit.length, z: lit.reduce((sum, spot) => sum + spot.z, 0) / lit.length }
}

// Share of the fire's peak heat still burning, from 0 to 1.
export function fireStrength(fire: Wildfire) {
  const peak = fire.hotspots.reduce((sum, spot) => sum + spot.peak, 0)
  return peak ? fire.hotspots.reduce((sum, spot) => sum + spot.heat, 0) / peak : 0
}

export function sprayTarget(fire: Wildfire | null | undefined, player: Point) {
  let best: Hotspot | undefined
  for (const spot of burningHotspots(fire)) {
    if (distance(spot, player) < wildfireSprayReach && (!best || distance(spot, player) < distance(best, player))) best = spot
  }
  return best
}

// Compass bearing in whole degrees, where north is +z and east is +x.
function bearingDegrees(from: Point, to: Point) {
  const degrees = Math.atan2(to.x - from.x, to.z - from.z) * fullTurnDegrees / (Math.PI + Math.PI)
  return Math.round((degrees + fullTurnDegrees) % fullTurnDegrees)
}

function compassName(degrees: number) {
  return compassPoints[Math.floor(((degrees + halfSector) % fullTurnDegrees) / compassSector)]
}

// What the fire finder reads: the bearing, rough distance and place of the smoke.
export function finderReading(fire: Wildfire) {
  const centre = fireCentre(fire)
  const degrees = bearingDegrees(fireFinder, centre)
  const metres = Math.round(distance(fireFinder, centre) / metresPerHundred) * metresPerHundred
  return { degrees, direction: compassName(degrees), metres, place: fireSite(fire.site).name }
}

export function atFireFinder(player: Pick<Player, 'x' | 'z' | 'y'>, deckHeight: number) {
  return distance(player, fireFinder) < fireFinderReachM && player.y >= deckHeight
}

export function extinguisherCharge(item: Pick<Item, 'charge'>) {
  return item.charge ?? 1
}

// The hint for a crewmate holding an extinguisher near a burning wildfire.
export function nearWildfire(state: Pick<Snapshot, 'events'>, player: Point) {
  return sprayTarget(state.events.fire, player) !== undefined
}

// An extinguisher set down by its own stand goes back onto it.
export function atExtinguisherHome(item: Item, player: Point) {
  return item.kind === 'extinguisher' && distance(itemStarts[item.id].start, player) < homeReachM
}
