import { distanceToRoute, footpaths, roads, walkways } from '../../routes.ts'
import { groundHeight } from '../../terrain.ts'
import { roadClearance, roadEarthworks } from '../../roads.ts'
import type { Point } from '../../world.ts'
import type { PlantingLayer } from './highwood-planting.ts'
import { highwoodBankCoverSlope, highwoodEarthworksM, highwoodRouteClearanceM, highwoodSightlines } from './layout/highwood-planting.ts'

// What Highwood keeps clear: its routes, its graded roads and its kept-open sight lines.
// The planting bake and the granite outcrops both read these, so a new road or view
// reaches both.

const half = 0.5

const highwoodRoutes = [...footpaths.map(({ points }) => points), ...walkways.map(({ points }) => points), ...roads]

// Whether a point stands more than `clearanceM` from every route's centreline and every
// graded road's formation edge (the fire road, summit spur, Pine Draw and ridge roads).
export function clearOfRoutes(point: Point, clearanceM: number) {
  return roadClearance(point) > clearanceM && highwoodRoutes.every((route) => distanceToRoute(point, route) > clearanceM)
}

// Whether a point is off the graded roads' cut and fill banks, where builders leave grass and
// ferns but no trees, logs or rocks.
export const clearOfEarthworks = (point: Point) => roadEarthworks(point) <= highwoodEarthworksM

// The graded ground's steepest rise per metre at a point, across one metre.
function gradedSlope({ x, z }: Point) {
  const h = half
  return Math.hypot(groundHeight({ x: x + h, z }) - groundHeight({ x: x - h, z }), groundHeight({ x, z: z + h }) - groundHeight({ x, z: z - h }))
}

// Whether ground cover can grow at a point: off the banks, or on a bank gentle enough to green over.
export const coverCanGrow = (point: Point) => clearOfEarthworks(point) || gradedSlope(point) <= highwoodBankCoverSlope

// Whether a plant of a layer may stand at a point beside the roads: off every route and graded
// road by the planting clearance, a tree or deadwood off the road banks, ground cover off banks
// too steep to green over. The planting bake keeps only plants that fit, and the forest, its
// solids and the granite outcrops read the same test (src/highwood-standing.ts) when a draft
// road is previewed, so all of them agree on which plants stand.
export function plantFits(point: Point, layer: PlantingLayer) {
  return (layer === 'understory' ? coverCanGrow(point) : clearOfEarthworks(point)) && clearOfRoutes(point, highwoodRouteClearanceM)
}

// How far along a kept-open sight line's corridor a point lies, or undefined outside every
// corridor. `padM` widens the corridor, for something with a footprint of that reach.
export function sightlineAlong(point: Point, padM = 0) {
  let nearest: number | undefined
  for (const { eye, look, reachM, halfWidthM, spread } of highwoodSightlines) {
    const dx = look.x - eye.x, dz = look.z - eye.z
    const length = Math.hypot(dx, dz)
    const along = ((point.x - eye.x) * dx + (point.z - eye.z) * dz) / length
    if (along < -padM || along > reachM + padM) continue
    const across = Math.abs((point.x - eye.x) * dz - (point.z - eye.z) * dx) / length
    if (across < halfWidthM + Math.max(0, along) * spread + padM) nearest = Math.min(nearest ?? along, along)
  }
  return nearest
}

export const inSightline = (point: Point, padM = 0) => sightlineAlong(point, padM) !== undefined
