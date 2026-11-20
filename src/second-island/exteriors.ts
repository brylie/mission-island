import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { MapPoint } from './sites.ts'

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

interface Exterior extends MapPoint {
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
const cream = '#f8e2b9', glass = '#426e73', shade = '#624e42', plank = '#926f55'

export function buildingLocal(point: MapPoint, building: Exterior) {
  const x = point.x - building.x, z = point.z - building.z
  const c = Math.cos(building.facing), s = Math.sin(building.facing)
  return { x: x * c - z * s, z: x * s + z * c }
}

export function createExterior(meshes: MeshFactory, building: Exterior, foundation = .48) {
  const root = new TransformNode(building.kind, meshes.scene)
  const { width: w, height: h, depth: d, kind, wall, roof } = building
  const box = (x: number, y: number, z: number, width: number, height: number, depth: number, color: string) =>
    meshes.box(x, y, z, width, height, depth, color, root)
  const window = (x: number, y: number, z: number, w = 1.4) => {
    box(x, y, z, w + .16, 1.28, .11, cream)
    box(x, y, z + .064, w, 1.08, .044, glass)
    box(x, y, z + .091, 0.065, 1.09, .038, cream)
    box(x, y - .64, z + .10, w + .24, .12, .29, '#b69e79')
  }
  const eave = d / 2
  const flat = kind === 'hospital' || kind === 'apartments' || kind === 'police' || kind === 'mine'
  box(0, .18 - foundation / 2, 0, w + .33, foundation + .38, d + .33, '#a6957d')
  box(0, h / 2 + .36, 0, w, h, d, wall)
  box(0, .46, 0, w + .095, .19, d + .095, cream)
  if (flat) {
    box(0, h + .53, 0, w + .62, .31, d + .62, roof)
    box(-w * .28, h + .99, -d * .21, 2.2, .62, 1.48, '#81908a')
  } else {
    const rise = Math.min(2.42, d * .27)
    const roofSpan = eave + .46
    const tilt = Math.atan2(rise, roofSpan)
    for (const side of [-1, 1]) {
      box(0, h + .36 + rise / 2, side * roofSpan / 2, w + .85, .24, Math.hypot(roofSpan, rise) + .1, roof).rotation.x = side * tilt
      box(side * (w / 2 - .08), h + .37 + rise * .19, 0, .21, rise * .38, d * .59, wall)
    }
    const gables = meshes.surface('Gable ends', [
      -w / 2, h + .35, -eave, -w / 2, h + .35 + rise, 0, -w / 2, h + .35, eave,
      w / 2, h + .35, -eave, w / 2, h + .35 + rise, 0, w / 2, h + .35, eave,
    ], [0, 2, 1, 3, 4, 5], wall, root, [0, 0, .5, 1, 1, 0, 0, 0, .5, 1, 1, 0])
    gables.receiveShadows = true
  }

  if (kind === 'fire' || kind === 'hangar' || kind === 'mill' || kind === 'mine') {
    const count = kind === 'fire' ? 2 : 1
    const doorWidth = kind === 'hangar' ? 13.1 : kind === 'mine' ? 6.3 : kind === 'mill' ? 6.4 : 4.15
    const doorHeight = kind === 'hangar' ? 4.8 : 4.15
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * (doorWidth + 1.05)
      box(x, doorHeight / 2 + .35, eave + .05, doorWidth + .31, doorHeight + .32, .15, cream)
      box(x, doorHeight / 2 + .34, eave + .14, doorWidth, doorHeight, .12, kind === 'mine' ? '#333d3b' : roof)
      if (kind !== 'mine') for (let row = 1; row < 7; row++) box(x, .36 + row * doorHeight / 7, eave + .205, doorWidth - .10, .034, .028, '#a2a29a')
      box(x, .19, eave + .52, doorWidth + .35, .38, 1.02, '#a6957d')
    }
  } else {
    const entryWidth = kind === 'hospital' || kind === 'market' || kind === 'school' ? 2.55 : 1.12
    box(0, 1.48, eave + .11, entryWidth + .22, 2.28, .19, cream)
    box(0, 1.445, eave + .22, entryWidth, 2.11, .06, kind === 'church' ? plank : glass)
    box(0, .18, eave + .46, entryWidth + 1.05, .36, .95, '#a99a80')
    box(0, .09, eave + 1.10, entryWidth + 1.05, .18, .37, '#b4a58b')
  }
  for (const side of [-1, 1]) {
    const floors = kind === 'apartments' ? 3 : kind === 'hospital' ? 2 : 1
    for (let floor = 0; floor < floors; floor++) {
      const y = 1.95 + floor * (h - .5) / floors
      window(side * w * .31, y, eave)
      if (w > 12 && !['fire', 'hangar', 'mill', 'mine'].includes(kind)) window(side * w * .155, y, eave)
    }
    for (const z of [-d * .28, 0, d * .28]) {
      box(side * (w / 2 + .045), 2, z, .14, 1.3, 1.36, cream)
      box(side * (w / 2 + .128), 2.02, z, .035, 1.04, 1.13, glass)
    }
  }
  createTower(meshes, root, building)
  if (kind === 'market' || kind === 'shop') {
    const awning = w * .72
    const depth = 2.85
    for (let i = 0; i < 10; i++) {
      const x = ((i + .5) / 10 - .5) * awning
      box(x, 3.17, eave + depth / 2, awning / 10, .15, depth, i % 2 ? cream : roof).rotation.x = .10
    }
    for (const side of [-1, 1]) box(side * (awning / 2 - .12), 1.48, eave + depth - .15, .15, 2.96, .15, plank)
    if (kind === 'market') for (const side of [-1, 1]) {
      box(side * awning * .29, .79, eave + 1.58, awning * .33, .87, 1.06, '#967352')
      box(side * awning * .29, 1.29, eave + 1.58, awning * .35, .15, 1.24, '#ca9e72')
      for (let i = 0; i < 3; i++) box(side * awning * .29 + (i - 1) * .56, 1.49, eave + 1.55, .49, .24, .49, i === 1 ? '#8da25a' : '#d5885b')
    }
  }
  if (kind === 'hospital' || kind === 'police' || kind === 'fire') {
    const z = eave + .22, y = h - .45
    box(0, y, z, 2.1, 1.05, .20, cream)
    const accent = kind === 'police' ? '#406c82' : '#bd5d50'
    box(0, y, z + .12, .87, .24, .08, accent)
    box(0, y, z + .17, .24, .74, .07, accent)
  }
  return root
}

function createTower(meshes: MeshFactory, root: TransformNode, building: Exterior) {
  const { kind, width: w, height: h, depth: d, wall, roof } = building
  const box = (x: number, y: number, z: number, width: number, height: number, depth: number, color: string) =>
    meshes.box(x, y, z, width, height, depth, color, root)
  if (kind === 'church' || kind === 'fire' || kind === 'school') {
    const x = kind === 'fire' ? -w * .37 : 0
    const y = kind === 'church' ? h + 3.7 : h + 1.7
    const z = kind === 'church' ? d * .30 : -d * .24
    const tower = kind === 'church' ? 3.15 : 2.75
    box(x, y - 1.6, z, tower, 4.7, tower, wall)
    meshes.cylinder(x, y + 1.55, z, .12, tower * 1.54, 2.04, 4, roof, root).rotation.y = Math.PI / 4
    box(x, y + 2.85, z, .12, .93, .12, shade)
    if (kind === 'church') box(x, y + 2.91, z, .62, .11, .12, shade)
    if (kind === 'school') box(x + .34, y + 3.14, z, .76, .39, .05, '#d37352')
  }
}
