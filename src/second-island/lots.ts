import type { MapPoint } from './sites.ts'

export const streetCanopy = { widthRatio: .72, depth: 2.85, height: 3.17 }

export const buildings = [
  { site: 'fish-market', kind: 'market', x: -247, z: -132, width: 15.8, depth: 11.4, height: 4.4, facing: 0, wall: '#72a6a1', roof: '#b86351' },
  { site: 'police', kind: 'police', x: -251, z: -69, width: 18, depth: 11.3, height: 5.1, facing: Math.PI, wall: '#668a99', roof: '#38555b' },
  { site: 'apartments', kind: 'apartments', x: -307, z: -144, width: 17, depth: 13.1, height: 9.5, facing: 0, wall: '#d4916b', roof: '#7b5450' },
  { site: 'grocery', kind: 'shop', x: -320, z: -74, width: 18, depth: 13.2, height: 4.6, facing: Math.PI, wall: '#edc780', roof: '#56816e' },
  { site: 'farmers-market', kind: 'market', x: 152, z: -30, width: 22, depth: 12, height: 5.3, facing: Math.PI, wall: '#dda553', roof: '#ab5445' },
  { site: 'school', kind: 'school', x: 271, z: -38, width: 18.4, depth: 12.3, height: 5.4, facing: -Math.PI / 2, wall: '#edca92', roof: '#b66150' },
  { site: 'hospital', kind: 'hospital', x: 136, z: 102, width: 23, depth: 13.5, height: 7.5, facing: 0, wall: '#e4dcc0', roof: '#658b82' },
  { site: 'fire', kind: 'fire', x: -57, z: 195, width: 21, depth: 13, height: 5.9, facing: Math.PI, wall: '#b65d4e', roof: '#815049' },
  { site: 'church', kind: 'church', x: -23, z: 192, width: 10, depth: 15, height: 6.1, facing: Math.PI, wall: '#ead7aa', roof: '#557374' },
  { site: 'timber', kind: 'mill', x: -249, z: 161, width: 23, depth: 16, height: 6.8, facing: 0, wall: '#a57550', roof: '#625b48' },
  { site: 'mine', kind: 'mine', x: 265, z: 181, width: 20, depth: 9.5, height: 5.8, facing: Math.PI, wall: '#a3937e', roof: '#68615a' },
  { site: 'airport', kind: 'hangar', x: 170, z: -114, width: 26, depth: 16, height: 7, facing: Math.PI, wall: '#7e9c99', roof: '#4f6973' },
] as const

export interface Exterior extends MapPoint {
  site: string; kind: typeof buildings[number]['kind'] | 'cottage'
  width: number; depth: number; height: number; facing: number; wall: string; roof: string
}

const cottageLots = [
  [-288, -86, Math.PI], [-285, -124, 0], [-268, -70, Math.PI], [-294, -64, Math.PI],
  [125, -42, Math.PI], [146, -85, 0], [172, -84, 0], [196, -16, Math.PI], [249, 3, -Math.PI / 2],
  [-84, 167, Math.PI], [-40, 173, Math.PI], [-28, 142, 0], [6, 162, Math.PI], [25, 137, 0],
]
const cottagePaint = [['#edc280', '#ac6550'], ['#cba487', '#7a6254'], ['#a8b8a0', '#526f65']]
export const islandBuildings: readonly Exterior[] = [...buildings, ...cottageLots.map(([x, z, facing], i): Exterior => {
  const [wall, roof] = cottagePaint[i % cottagePaint.length]
  return { kind: 'cottage', site: `cottage-${i}`, x, z, facing, width: 7.2, depth: 6.3, height: 3.35, wall, roof }
})]
export function buildingLocal(point: MapPoint, building: Exterior) {
  const x = point.x - building.x, z = point.z - building.z
  const c = Math.cos(building.facing), s = Math.sin(building.facing)
  return { x: x * c - z * s, z: x * s + z * c }
}
