import { footpaths, roads, walkways } from '../../routes.ts'
import type { Point } from '../../world.ts'
import { highwoodSightlines } from './layout/highwood-planting.ts'

// What Highwood keeps clear: its routes and its kept-open sight lines, for the granite
// outcrops and tests. The planting bake (generation/plant-highwood.ts) keeps its own copy
// for now, because changing it forces a rebake; move it onto these at the next rebake,
// so a new road or view reaches both.

export const highwoodRoutes = [...footpaths.map(({ points }) => points), ...walkways.map(({ points }) => points), ...roads]

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
