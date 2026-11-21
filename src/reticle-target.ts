import { sameChoice } from './interaction-options.ts'
import type { Interaction } from './interaction-options.ts'

type Vec = { x: number, y: number, z: number }
export interface AimRay { origin: Vec, direction: Vec, reach: number }

// The focus keeps a little extra radius so it does not flicker at the edge of a target.
const stickiness = 0.12

// Which interaction the reticle is on: the nearest target sphere the camera ray passes through
// before it reaches a wall. Interactions without a place in the world are never aimed at.
export function aimedInteraction(options: readonly Interaction[], ray: AimRay | undefined, previous?: Interaction) {
  if (!ray) return
  let best: Interaction | undefined
  let nearest = Infinity
  for (const option of options) {
    if (!option.at) continue
    const offset = { x: option.at.x - ray.origin.x, y: option.at.y - ray.origin.y, z: option.at.z - ray.origin.z }
    const along = offset.x * ray.direction.x + offset.y * ray.direction.y + offset.z * ray.direction.z
    if (along <= 0 || along > ray.reach) continue
    const miss = Math.hypot(offset.x - ray.direction.x * along, offset.y - ray.direction.y * along, offset.z - ray.direction.z * along)
    const radius = (option.radius ?? 0.5) + (previous && sameChoice(option, previous) ? stickiness : 0)
    if (miss <= radius && along < nearest) {
      best = option
      nearest = along
    }
  }
  return best
}
