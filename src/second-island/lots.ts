import { saltwindCottageExterior, streetCanopy } from '../assets/geometry/saltwind-exteriors.ts'
import { saltwindBuildingLots, saltwindCottageLots } from '../worlds/saltwind/layout/scenery.ts'
import type { MapPoint } from './sites.ts'

export { saltwindBuildingLots as buildings, streetCanopy }

export interface Exterior extends MapPoint {
  site: string
  kind: typeof saltwindBuildingLots[number]['kind'] | 'cottage'
  width: number
  depth: number
  height: number
  facing: number
  wall: string
  roof: string
}

const { cottagePaint, ...cottageSize } = saltwindCottageExterior
export const islandBuildings: readonly Exterior[] = [...saltwindBuildingLots, ...saltwindCottageLots.map(([x, z, facing], i): Exterior => {
  const [wall, roof] = cottagePaint[i % cottagePaint.length]
  return { kind: 'cottage', site: `cottage-${i}`, x, z, facing, ...cottageSize, wall, roof }
})]
export function buildingLocal(point: MapPoint, building: Exterior) {
  const x = point.x - building.x, z = point.z - building.z
  const c = Math.cos(building.facing), s = Math.sin(building.facing)
  return { x: x * c - z * s, z: x * s + z * c }
}
