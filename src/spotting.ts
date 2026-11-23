import { crewFace, crewHeadFit } from './assets/geometry/crew-face.ts'
import { fireWatchGeometry } from './assets/geometry/fire-watch.ts'
import { houseRoofRise } from './assets/geometry/starter-house.ts'
import { fireWatch } from './fire-watch.ts'
import type { Player, Snapshot } from './protocol.ts'
import { fireWatchBaseHeight, groundHeight, waterLevel } from './terrain.ts'
import { buildings, distance, localPoint, type Point } from './world.ts'

// Spotting is how a lookout fixes a place from far off: a compass bearing and a distance.
// The fire finder and the crew's binoculars both read through these helpers, on the host and in the browser.

interface Spot extends Point {
  y: number
}

const fullTurnDegrees = 360
const compassPoints = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const
const compassSector = fullTurnDegrees / compassPoints.length
const half = 0.5
const halfSector = compassSector * half

// Every crewmate carries 8×42 binoculars: eight times magnification through 42 mm objective lenses.
// The objective size sets how much light they gather, which the game does not model.
export const binocularMagnification = 8
// The built-in laser rangefinder reads out to this far. Ground beyond it shows a dash.
export const rangefinderReachM = 800
// The binoculars look out from the crewmate's eyes, taken from the crew head model.
export const binocularEyeHeightM = crewHeadFit.position[1] + crewFace.eye.position.y * crewHeadFit.scale[1]

// The rangefinder steps along its beam this far at a time, then halves the last step until it is this close.
const marchStepM = 1
const refineToleranceM = 0.02
const parallelTolerance = 1e-6

// Compass bearing in whole degrees, where north is +z and east is +x.
export function bearingDegrees(from: Point, to: Point) {
  const degrees = Math.atan2(to.x - from.x, to.z - from.z) * fullTurnDegrees / (Math.PI + Math.PI)
  return Math.round(degrees + fullTurnDegrees) % fullTurnDegrees
}

export function compassName(degrees: number) {
  return compassPoints[Math.floor(((degrees + halfSector) % fullTurnDegrees) / compassSector)]
}

function surfaceAt(point: Point) {
  const ground = groundHeight(point)
  return ground < waterLevel ? { height: waterLevel, surface: 'water' as const } : { height: ground, surface: 'ground' as const }
}

function along(origin: Spot, direction: Spot, metres: number): Spot {
  return { x: origin.x + direction.x * metres, y: origin.y + direction.y * metres, z: origin.z + direction.z * metres }
}

interface Solid { x: number, z: number, heading: number, halfWidth: number, halfDepth: number, floor: number, top: number }

const houseSolids: Solid[] = buildings.map((building) => ({
  x: building.x,
  z: building.z,
  heading: building.heading ?? 0,
  halfWidth: building.w * half,
  halfDepth: building.d * half,
  floor: 0,
  top: building.h + houseRoofRise,
}))

// The Fire Watch cab as one box from the ground to its roof ridge. A crewmate looking out from inside it ranges past it.
function towerSolid(): Solid {
  const { deck, cab } = fireWatchGeometry
  const reach = deck.area[1] + cab.roofOverhang
  return { ...fireWatch, halfWidth: reach, halfDepth: reach, floor: fireWatchBaseHeight(), top: fireWatchBaseHeight() + deck.top + cab.roofHeight + cab.roofRise }
}

// Where the beam first enters a house or the tower, skipping any box the beam starts inside.
function buildingEntry(origin: Spot, direction: Spot, reach: number) {
  let nearest = reach
  for (const solid of [...houseSolids, towerSolid()]) {
    const start = localPoint(solid, origin)
    const ahead = localPoint({ ...solid, x: 0, z: 0 }, direction)
    const slabs: [number, number, number, number][] = [
      [start.x, ahead.x, -solid.halfWidth, solid.halfWidth],
      [origin.y, direction.y, solid.floor, solid.top],
      [start.z, ahead.z, -solid.halfDepth, solid.halfDepth],
    ]
    if (slabs.every(([from, , min, max]) => from >= min && from <= max)) continue
    let entry = 0, exit = nearest
    for (const [from, step, min, max] of slabs) {
      if (Math.abs(step) < parallelTolerance) {
        if (from < min || from > max) exit = -1
        continue
      }
      const near = (min - from) / step, far = (max - from) / step
      entry = Math.max(entry, Math.min(near, far))
      exit = Math.min(exit, Math.max(near, far))
    }
    if (entry <= exit && entry < nearest) nearest = entry
  }
  return nearest
}

// Where the beam meets the ground or the sea, marched in metre steps and then refined by halving.
function terrainEntry(origin: Spot, direction: Spot, reach: number) {
  let clear = 0
  for (let metres = marchStepM; metres <= reach; metres += marchStepM) {
    const point = along(origin, direction, metres)
    if (point.y > surfaceAt(point).height) {
      clear = metres
      continue
    }
    let blocked = metres
    while (blocked - clear > refineToleranceM) {
      const middle = (clear + blocked) * half
      const probe = along(origin, direction, middle)
      if (probe.y > surfaceAt(probe).height) clear = middle
      else blocked = middle
    }
    return blocked
  }
  return undefined
}

// The laser rangefinder: the first ground, water or building along the line of sight, within reach.
// Trees, crew and vehicles do not stop the beam.
export function rangeFind(origin: Spot, direction: Spot, reach = rangefinderReachM) {
  const length = Math.hypot(direction.x, direction.y, direction.z)
  if (!length) return undefined
  const unit = { x: direction.x / length, y: direction.y / length, z: direction.z / length }
  const ground = terrainEntry(origin, unit, reach)
  const wall = buildingEntry(origin, unit, ground ?? reach)
  const metres = ground === undefined || wall < ground ? wall : ground
  if (metres >= reach && ground === undefined) return undefined
  const point = along(origin, unit, metres)
  const surface = ground !== undefined && metres === ground ? surfaceAt(point).surface : 'building' as const
  return { ...point, metres, surface }
}

// What shows under the reticle: the line-of-sight distance and the compass bearing, or a dash past reach.
export function rangeReadout(metres: number | undefined, degrees: number) {
  const range = metres === undefined ? '—' : `${Math.round(metres)} m`
  return `${range} · ${degrees}° ${compassName(degrees)}`
}

// Binoculars come out only on foot: not seated, flying, swimming, asleep or pushing the barrow.
export function canUseBinoculars(state: Pick<Snapshot, 'aviation' | 'farmWork'>, player: Player) {
  return player.connected && !player.seat && !player.swimming && !player.sleeping
    && state.aviation.flight?.pilotId !== player.id && state.farmWork.barrow?.handler !== player.id
}

// One mark at a time per crewmate. A second click this soon after the last is ignored, so a held button cannot flood the crew.
export const markCooldownMs = 1500

// A mark the host accepts lies within the rangefinder's reach of the crewmate, with a little slack for movement.
const markSlackM = 4
export function withinMarkReach(player: Point, point: Point) {
  return distance(player, point) <= rangefinderReachM + markSlackM
}
