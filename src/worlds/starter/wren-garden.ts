import { backPath, fenceZ, gateway } from '../../gate-repair.ts'
import { seededRandom } from '../../seeded-random.ts'
import { distance, wrenCottage } from '../../world.ts'
import type { Point } from '../../world.ts'

// Wren is a carpenter who keeps a tidy cottage garden. These placements dress the cottage
// and yard; models live in src/assets/wren-garden.ts and the solid ones join the colliders.
const { x, z, w, d } = wrenCottage
const front = z - d / 2
const back = z + d / 2

// Low flower beds inside the fence, clear of the gate leaf's swing and the front path.
export const flowerBeds = [
  { x: x - 2.05, z: fenceZ + 1.15, width: .75, depth: 1.75, flowers: ['#b99bd8', '#f4ead0', '#e9c35a'] },
  { x: x + 1.6, z: fenceZ + .62, width: 1.5, depth: .7, flowers: ['#f4ead0', '#b99bd8', '#e98a6b'] },
]

// Flagstones from the gate to the front door: the shortcut Wren takes once the gate is mended.
export const frontPath = Array.from({ length: 4 }, (_, i) => ({
  x: gateway.x + [-.05, .07, -.03, .05][i], z: fenceZ + .38 + i * (front - fenceZ - .85) / 3, width: [.7, .62, .74, .66][i], depth: .42,
}))

export const woodpile = { x: x + 1.72, z: back + .34, heading: 0 }
export const sawhorse = { x: x + 1.55, z: back + 1.55, heading: .35 }
export const rainBarrel = { x: x + 1.02, z: back + .34 }
export const chimney = { x: x + 1.15, z: z + .55, w: .5, d: .5 }
export const windowBoxes = [-1, 1].map((side) => ({ x: x + side * w * .31, z: front - .17 }))

// The worn back path: muted stones of uneven size and spacing, slightly sunk into the grass.
export const steppingStones = (() => {
  const random = seededRandom(7721)
  const stones: (Point & { rx: number; rz: number; heading: number; tone: number })[] = []
  for (let i = 1; i < backPath.length; i++) {
    const [from, to] = [backPath[i - 1], backPath[i]]
    const length = distance(from, to)
    for (let along = .55; along < length - .2; along += .78 + random() * .3) {
      const f = along / length, sway = (random() - .5) * .26
      stones.push({ x: from.x + (to.x - from.x) * f + sway * (to.z - from.z) / length,
        z: from.z + (to.z - from.z) * f - sway * (to.x - from.x) / length,
        rx: .19 + random() * .08, rz: .15 + random() * .07, heading: random() * Math.PI, tone: random() })
    }
  }
  return stones
})()
