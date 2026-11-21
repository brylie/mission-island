import type { Ore } from '../ore-contracts.ts'

interface OreStockpileProfile {
  rx: number
  rz: number
  height: number
  grain: number
  dust: string
  host: string
  seed: number
}

export const oreStockpileProfiles = {
  'magnetite-seam': { rx: 2.47, rz: 2.97, height: 1.71, grain: 0.19, dust: '#615d57', host: '#575a58', seed: 739 },
  'malachite-bloom': { rx: 2.02, rz: 2.59, height: 1.31, grain: 0.24, dust: '#7a7160', host: '#7e7968', seed: 1571 },
  'honey-calcite': { rx: 1.81, rz: 2.26, height: 1.06, grain: 0.28, dust: '#a89474', host: '#ab9678', seed: 1381 },
} as const satisfies Record<Ore, OreStockpileProfile>

type PlacedSlope = Pick<OreStockpileProfile, 'rx' | 'rz' | 'height'> & { cx: number, cz: number }

export function createStockpileProfile({ cx, cz, rx, rz, height }: PlacedSlope, terrainHeight: (x: number, z: number) => number, random: () => number) {
  const phase = random() * Math.PI * 2
  return (angle: number, t: number): [number, number, number] => {
    const edge = 1 + 0.052 * Math.sin(3 * angle + phase) + 0.032 * Math.cos(5 * angle - phase)
    const dx = Math.cos(angle), dz = Math.sin(angle)
    const x = cx + t * rx * edge * dx + 0.22 * (1 - t)
    const z = cz + t * rz * edge * dz + 0.45 * (1 - t)
    // A bucket bite on the open face gives each load a steeper, concave toe.
    const scoop = Math.max(0, -dz) ** 5 * Math.sin(Math.min(1, t) * Math.PI) * 0.24
    const y = terrainHeight(x, z) + height * Math.max(0, 1 - t - scoop)
    return [x, y, z]
  }
}
