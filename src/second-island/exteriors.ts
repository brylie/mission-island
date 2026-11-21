import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createSaltwindWindow, saltwindWindowRow } from '../assets/saltwind-window'
import type { MeshFactory } from '../island-meshes'
import { streetCanopy } from './lots'
import type { Exterior } from './lots'

const cream = '#f8e2b9', glass = '#426e73', shade = '#624e42', plank = '#926f55'

export function createExterior(meshes: MeshFactory, building: Exterior, foundation = 0.48, parts: { roof?: 'flat' | 'gable', canopy?: boolean, tower?: 'school' | 'fire' | 'church' | 'none' } = {}) {
  const root = new TransformNode(building.kind, meshes.scene)
  const { width: w, height: h, depth: d, kind, wall, roof } = building
  const box = (x: number, y: number, z: number, width: number, height: number, depth: number, color: string) =>
    meshes.box(x, y, z, width, height, depth, color, root)
  const eave = d / 2
  const flat = parts.roof ? parts.roof === 'flat' : ['hospital', 'apartments', 'police', 'mine'].includes(kind)
  box(0, 0.18 - foundation / 2, 0, w + 0.33, foundation + 0.38, d + 0.33, '#a6957d')
  box(0, h / 2 + 0.36, 0, w, h, d, wall)
  box(0, 0.46, 0, w + 0.095, 0.19, d + 0.095, cream)
  if (flat) {
    box(0, h + 0.53, 0, w + 0.62, 0.31, d + 0.62, roof)
    box(-w * 0.28, h + 0.99, -d * 0.21, 2.2, 0.62, 1.48, '#81908a')
  }
  else {
    const rise = Math.min(2.42, d * 0.27)
    const roofSpan = eave + 0.46
    const tilt = Math.atan2(rise, roofSpan)
    for (const side of [-1, 1]) {
      box(0, h + 0.36 + rise / 2, side * roofSpan / 2, w + 0.85, 0.24, Math.hypot(roofSpan, rise) + 0.1, roof).rotation.x = side * tilt
      box(side * (w / 2 - 0.08), h + 0.37 + rise * 0.19, 0, 0.21, rise * 0.38, d * 0.59, wall)
    }
    const gables = meshes.surface('Gable ends', [
      -w / 2,
      h + 0.35,
      -eave,
      -w / 2,
      h + 0.35 + rise,
      0,
      -w / 2,
      h + 0.35,
      eave,
      w / 2,
      h + 0.35,
      -eave,
      w / 2,
      h + 0.35 + rise,
      0,
      w / 2,
      h + 0.35,
      eave,
    ], [0, 2, 1, 3, 4, 5], wall, root, [0, 0, 0.5, 1, 1, 0, 0, 0, 0.5, 1, 1, 0])
    gables.receiveShadows = true
  }

  if (kind === 'fire' || kind === 'hangar' || kind === 'mill' || kind === 'mine') {
    const count = kind === 'fire' ? 2 : 1
    const doorWidth = kind === 'hangar' ? 13.1 : kind === 'mine' ? 6.3 : kind === 'mill' ? 6.4 : 4.15
    const doorHeight = kind === 'hangar' ? 4.8 : 4.15
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * (doorWidth + 1.05)
      box(x, doorHeight / 2 + 0.35, eave + 0.05, doorWidth + 0.31, doorHeight + 0.32, 0.15, cream)
      box(x, doorHeight / 2 + 0.34, eave + 0.14, doorWidth, doorHeight, 0.12, kind === 'mine' ? '#333d3b' : roof)
      if (kind !== 'mine') for (let row = 1; row < 7; row++) box(x, 0.36 + row * doorHeight / 7, eave + 0.205, doorWidth - 0.10, 0.034, 0.028, '#a2a29a')
      box(x, 0.19, eave + 0.52, doorWidth + 0.35, 0.38, 1.02, '#a6957d')
    }
  }
  else {
    const entryWidth = kind === 'hospital' || kind === 'market' || kind === 'school' ? 2.55 : 1.12
    box(0, 1.48, eave + 0.11, entryWidth + 0.22, 2.28, 0.19, cream)
    box(0, 1.445, eave + 0.22, entryWidth, 2.11, 0.06, kind === 'church' ? plank : glass)
    box(0, 0.18, eave + 0.46, entryWidth + 1.05, 0.36, 0.95, '#a99a80')
    box(0, 0.09, eave + 1.10, entryWidth + 1.05, 0.18, 0.37, '#b4a58b')
  }
  for (const side of [-1, 1]) {
    const floors = kind === 'apartments' ? 3 : kind === 'hospital' ? 2 : 1
    for (let floor = 0; floor < floors; floor++) {
      const y = saltwindWindowRow.centreY + floor * (h - 0.5) / floors
      createSaltwindWindow(meshes, root, side * w * saltwindWindowRow.edgeFraction, y, eave)
      if (w > 12 && !['fire', 'hangar', 'mill', 'mine'].includes(kind)) createSaltwindWindow(meshes, root, side * w * 0.155, y, eave)
    }
    for (const z of [-d * 0.28, 0, d * 0.28]) {
      box(side * (w / 2 + 0.045), 2, z, 0.14, 1.3, 1.36, cream)
      box(side * (w / 2 + 0.128), 2.02, z, 0.035, 1.04, 1.13, glass)
    }
  }
  if (parts.tower !== 'none') createTower(meshes, root, { ...building, kind: parts.tower ?? kind })
  if (parts.canopy ?? (kind === 'market' || kind === 'shop')) addStreetCanopy(meshes, root, building)
  addServiceEmblem(meshes, root, building)
  return root
}

function addStreetCanopy(meshes: MeshFactory, root: TransformNode, building: Exterior) {
  const awning = building.width * streetCanopy.widthRatio
  const depth = streetCanopy.depth
  const eave = building.depth / 2
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
    meshes.box(x, y, z, w, h, d, color, root)
  for (let i = 0; i < 10; i++) {
    const x = ((i + 0.5) / 10 - 0.5) * awning
    box(x, streetCanopy.height, eave + depth / 2, awning / 10, 0.15, depth, i % 2 ? cream : building.roof).rotation.x = 0.10
  }
  for (const side of [-1, 1]) box(side * (awning / 2 - 0.12), 1.48, eave + depth - 0.15, 0.15, 2.96, 0.15, plank)
  if (building.kind !== 'market' || building.site === 'fish-market') return
  for (const side of [-1, 1]) {
    box(side * awning * 0.29, 0.79, eave + 1.58, awning * 0.33, 0.87, 1.06, '#967352')
    box(side * awning * 0.29, 1.29, eave + 1.58, awning * 0.35, 0.15, 1.24, '#ca9e72')
    stockMarketCounter(meshes, root, side * awning * 0.29, eave + 1.58)
  }
}

function stockMarketCounter(meshes: MeshFactory, root: TransformNode, x: number, z: number) {
  meshes.box(x, 1.405, z, 2.05, 0.09, 0.88, '#a57a55', root)
  for (const side of [-1, 1]) meshes.box(x, 1.45, z + side * 0.44, 2.1, 0.17, 0.055, '#bb9268', root)
  for (const offset of [-0.62, 0, 0.62]) {
    for (const side of [-1, 1]) meshes.sphere(x + offset, 1.52, z + side * 0.18, 0.30, 0.26, 0.29, offset === 0 ? '#87a858' : '#db9653', root, true, 6)
  }
}

function addServiceEmblem(meshes: MeshFactory, root: TransformNode, building: Exterior) {
  const { kind, height: h, depth } = building
  const eave = depth / 2
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
    meshes.box(x, y, z, w, h, d, color, root)
  if (kind === 'hospital' || kind === 'police' || kind === 'fire') {
    const z = eave + 0.22, y = h - 0.45
    box(0, y, z, 2.1, 1.05, 0.20, cream)
    const accent = kind === 'police' ? '#406c82' : '#bd5d50'
    if (kind === 'hospital') {
      box(0, y, z + 0.12, 0.87, 0.24, 0.08, accent)
      box(0, y, z + 0.17, 0.24, 0.74, 0.07, accent)
    }
    else if (kind === 'police') {
      meshes.cylinder(0, y, z + 0.14, 0.76, 0.76, 0.12, 5, accent, root).rotation.x = Math.PI / 2
      box(0, y, z + 0.22, 0.31, 0.09, 0.05, cream)
    }
    else {
      for (const side of [-1, 1]) {
        box(side * 0.04, y, z + 0.13 + side * 0.035, 0.13, 0.81, 0.07, accent).rotation.z = side * 0.76
        box(side * 0.28, y + 0.26, z + 0.14 + side * 0.035, 0.3, 0.18, 0.07, accent).rotation.z = side * 0.66
      }
    }
  }
}

function createTower(meshes: MeshFactory, root: TransformNode, building: Exterior) {
  const { kind, width: w, height: h, depth: d, wall, roof } = building
  const box = (x: number, y: number, z: number, width: number, height: number, depth: number, color: string) =>
    meshes.box(x, y, z, width, height, depth, color, root)
  if (kind === 'church' || kind === 'fire' || kind === 'school') {
    const x = kind === 'fire' ? -w * 0.37 : 0
    const y = kind === 'church' ? h + 3.7 : h + 1.7
    const z = kind === 'church' ? d * 0.30 : -d * 0.24
    const tower = kind === 'church' ? 3.15 : 2.75
    box(x, y - 1.6, z, tower, 4.7, tower, wall)
    meshes.cylinder(x, y + 1.55, z, 0.12, tower * 1.54, 2.04, 4, roof, root).rotation.y = Math.PI / 4
    box(x, y + 2.85, z, 0.12, 0.93, 0.12, shade)
    if (kind === 'church') box(x, y + 2.91, z, 0.62, 0.11, 0.12, shade)
    if (kind === 'school') box(x + 0.34, y + 3.14, z, 0.76, 0.39, 0.05, '#d37352')
  }
}
