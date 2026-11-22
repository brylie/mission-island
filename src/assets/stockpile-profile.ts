import { oreStockpileProfiles, stockpileSlope, type OreStockpileProfile } from './geometry/ore-stockpile.ts'

export { oreStockpileProfiles }

type PlacedSlope = Pick<OreStockpileProfile, 'rx' | 'rz' | 'height'> & { cx: number, cz: number }

const halfTurnsPerCircle = 2

export function createStockpileProfile({ cx, cz, rx, rz, height }: PlacedSlope, terrainHeight: (x: number, z: number) => number, random: () => number) {
  const phase = random() * Math.PI * halfTurnsPerCircle
  const { edgeSine, edgeCosine, crestOffset, bucketScoop } = stockpileSlope
  return (angle: number, t: number): [number, number, number] => {
    const edge = 1 + edgeSine.amplitude * Math.sin(edgeSine.frequency * angle + phase)
      + edgeCosine.amplitude * Math.cos(edgeCosine.frequency * angle - phase)
    const dx = Math.cos(angle), dz = Math.sin(angle)
    const x = cx + t * rx * edge * dx + crestOffset.x * (1 - t)
    const z = cz + t * rz * edge * dz + crestOffset.z * (1 - t)
    // A bucket bite on the open face gives each load a steeper, concave toe.
    const scoop = Math.max(0, -dz) ** bucketScoop.facingPower * Math.sin(Math.min(1, t) * Math.PI) * bucketScoop.depth
    const y = terrainHeight(x, z) + height * Math.max(0, 1 - t - scoop)
    return [x, y, z]
  }
}
