import { seededRandom } from '../seeded-random.ts'
import { surfaceHeight } from './terrain.ts'
import type { ScenerySolids } from './walking.ts'

export const stockpiles = [
  { id: 'magnetite-seam', cx: 288.8, cz: 182, rx: 2.47, rz: 2.97, height: 1.71, grain: 0.19, dust: '#615d57', host: '#575a58', seed: 739 },
  { id: 'malachite-bloom', cx: 293.75, cz: 182.45, rx: 2.02, rz: 2.59, height: 1.31, grain: 0.24, dust: '#7a7160', host: '#7e7968', seed: 1571 },
  { id: 'honey-calcite', cx: 298.18, cz: 181.89, rx: 1.81, rz: 2.26, height: 1.06, grain: 0.28, dust: '#a89474', host: '#ab9678', seed: 1381 },
] as const

// Place the walkable slope and return the same profile for the fines and rubble.
export function placeStockpile(load: typeof stockpiles[number], solids: ScenerySolids, random = seededRandom(load.seed)) {
  const { cx, cz, rx, rz, height } = load
  const phase = random() * Math.PI * 2
  function point(angle: number, t: number): [number, number, number] {
    const edge = 1 + 0.052 * Math.sin(3 * angle + phase) + 0.032 * Math.cos(5 * angle - phase)
    const dx = Math.cos(angle), dz = Math.sin(angle)
    const x = cx + t * rx * edge * dx + 0.22 * (1 - t)
    const z = cz + t * rz * edge * dz + 0.45 * (1 - t)
    // A bucket bite on the open face gives each load a steeper, concave toe.
    const scoop = Math.max(0, -dz) ** 5 * Math.sin(Math.min(1, t) * Math.PI) * 0.24
    const y = surfaceHeight(x, z) + height * Math.max(0, 1 - t - scoop)
    return [x, y, z]
  }

  // Only bulk material blocks the walker. Short steps approximate the
  // slope without giving the loose fragments a bin-sized bounding box.
  for (let r = 0; r <= 0.96; r += 0.07) {
    const count = Math.max(1, Math.ceil(r * 46))
    for (let i = 0; i < count; i++) {
      const [x, y, z] = point(i * Math.PI * 2 / count, r)
      solids.add({ x, z, bottom: surfaceHeight(x, z) - 0.05, top: y, width: 0.30, depth: 0.32, heading: 0 })
    }
  }
  return point
}
