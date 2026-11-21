import { createStockpileProfile, oreStockpileProfiles } from '../assets/stockpile-profile.ts'
import { seededRandom } from '../seeded-random.ts'
import { stockpilePlacements } from '../worlds/saltwind/layout/quarry.ts'
import { surfaceHeight } from './terrain.ts'
import type { ScenerySolids } from './walking.ts'

export const stockpiles = stockpilePlacements.map((placement) => ({ ...placement, ...oreStockpileProfiles[placement.id] }))

const outerCollisionRing = 0.96
const collisionRingSpacing = 0.07
const outerRingSamples = 46
const halfTurnsPerCircle = 2
const collisionGroundOverlap = 0.05
const collisionWidth = 0.30
const collisionDepth = 0.32

// Place the walkable slope and return the same profile for the fines and rubble.
export function placeStockpile(load: typeof stockpiles[number], solids: ScenerySolids, random = seededRandom(load.seed)) {
  const point = createStockpileProfile(load, surfaceHeight, random)
  // Only bulk material blocks the walker. Short steps approximate the
  // slope without giving the loose fragments a bin-sized bounding box.
  for (let r = 0; r <= outerCollisionRing; r += collisionRingSpacing) {
    const count = Math.max(1, Math.ceil(r * outerRingSamples))
    for (let i = 0; i < count; i++) {
      const [x, y, z] = point(i * Math.PI * halfTurnsPerCircle / count, r)
      solids.add({ x, z, bottom: surfaceHeight(x, z) - collisionGroundOverlap, top: y, width: collisionWidth, depth: collisionDepth, heading: 0 })
    }
  }
  return point
}
