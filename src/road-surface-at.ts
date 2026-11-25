import { roadNetwork } from './assets/geometry/road-kinds.ts'
import { nearGradedRoad, roadCarriageways, roadClearance } from './roads.ts'
import type { Point } from './world.ts'

// Which surface underfoot a graded road gives at a point, for footsteps and wildlife. It lives
// apart from src/roads.ts so a change to how roads sound or feel is not a source of any bake.

// What a graded road's surface is at a point: its asphalt apron where it meets a paved road,
// shoulders included as the surface draws it; its earth carriageway (junction mouths included);
// its verge over the shoulders; or none. A paved road's own shoulder is not a graded verge.
export function roadSurfaceAt(point: Point): 'asphalt' | 'earth' | 'verge' | undefined {
  if (!nearGradedRoad(point)) return undefined
  const { distance, paved } = roadCarriageways(point)
  const apron = paved < roadNetwork.apronM
  if (distance <= 0) return apron ? 'asphalt' : 'earth'
  if (roadClearance(point) > 0) return undefined
  return apron ? 'asphalt' : 'verge'
}
