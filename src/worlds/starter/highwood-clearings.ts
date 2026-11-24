import { distanceToRoute, footpaths, roads, walkways } from '../../routes.ts'
import { roadClearance, roadEarthworks } from '../../terrain.ts'
import type { Point } from '../../world.ts'
import { highwoodEarthworksM, highwoodSightlines } from './layout/highwood-planting.ts'

// What Highwood keeps clear: its routes, its graded roads and its kept-open sight lines.
// The planting bake and the granite outcrops both read these, so a new road or view
// reaches both.

export const highwoodRoutes = [...footpaths.map(({ points }) => points), ...walkways.map(({ points }) => points), ...roads]

// Whether a point stands more than `clearanceM` from every route's centreline and every
// graded road's formation edge (the fire road, summit spur, Pine Draw and ridge roads).
export function clearOfRoutes(point: Point, clearanceM: number) {
  return roadClearance(point) > clearanceM && highwoodRoutes.every((route) => distanceToRoute(point, route) > clearanceM)
}

// Whether a point is off the graded roads' cut and fill banks, where builders leave grass and
// ferns but no trees, logs or rocks.
export const clearOfEarthworks = (point: Point) => roadEarthworks(point) <= highwoodEarthworksM

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
