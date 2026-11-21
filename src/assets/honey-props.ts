import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { createIslandMaterial } from '../materials'

const cream = '#f8dfb5', copper = '#ad6e48', honey = '#e39a32'
const wood = '#af8153', darkWood = '#745741'
const landingBoard = { y: 0.482, z: 0.401, height: 0.043 }
export const honeyHiveEntrance = { y: 0.536, z: 0.40, width: 0.37, floor: landingBoard.y + landingBoard.height / 2 } as const

function jar(meshes: MeshFactory, parent: TransformNode, filled: boolean, x = 0, y = 0, z = 0) {
  const root = new TransformNode(filled ? 'Capped honey jar' : 'Clean jar', meshes.scene)
  root.parent = parent
  root.position.set(x, y, z)
  meshes.cylinder(0, 0.076, 0, 0.126, 0.143, 0.148, 12, filled ? honey : '#afc4ba', root, false)
  meshes.cylinder(0, 0.155, 0, 0.134, 0.134, 0.026, 12, filled ? '#85583f' : '#c6d9c8', root, false)
  meshes.box(0, 0.081, 0.068, 0.073, 0.049, 0.009, cream, root, false)
  meshes.box(-0.042, 0.101, 0.059, 0.013, 0.044, 0.008, '#fff1c8', root, false)
  return root
}

function bench(meshes: MeshFactory, root: TransformNode, width: number, depth: number) {
  meshes.box(0, 0.77, 0, width, 0.085, depth, wood, root)
  for (const x of [-width / 2 + 0.15, width / 2 - 0.15]) for (const z of [-depth / 2 + 0.12, depth / 2 - 0.12]) {
    meshes.box(x, 0.366, z, 0.093, 0.73, 0.092, darkWood, root)
  }
}

export function buildHoneyShelf(meshes: MeshFactory, root: TransformNode, reward: number) {
  bench(meshes, root, 0.92, 0.52)
  for (const x of [-0.27, -0.03, 0.21]) jar(meshes, root, true, x, 0.813)
  const card = meshes.box(0.318, 0.915, -0.04, 0.22, 0.19, 0.024, cream, root)
  card.rotation.x = -0.23
  const label = new DynamicTexture('Honey shelf price', { width: 192, height: 128 }, meshes.scene, true)
  label.drawText('HONEY', null, 52, 'bold 35px Georgia', '#655141', '#f3d5a2', false)
  label.drawText(reward + ' COINS', null, 96, 'bold 28px Georgia', '#655141', null, true)
  const print = new StandardMaterial('Honey price card', meshes.scene)
  print.diffuseTexture = label
  print.backFaceCulling = false
  const face = new TransformNode('Price card face', meshes.scene)
  face.position.copyFrom(card.position)
  face.rotation.copyFrom(card.rotation)
  face.parent = root
  meshes.surface('Honey price', [-0.104, -0.087, -0.015, 0.104, -0.087, -0.015, 0.104, 0.087, -0.015, -0.104, 0.087, -0.015], [0, 1, 2, 0, 2, 3], print, face, [0, 0, 1, 0, 1, 1, 0, 1])
  meshes.batchModel(root)
}

export function buildHoneyHive(meshes: MeshFactory, root: TransformNode, variant: 'light' | 'dark') {
  const light = variant === 'light'
  for (const x of [-0.3, 0.3]) meshes.box(x, 0.17, 0, 0.12, 0.34, 0.72, darkWood, root)
  meshes.box(0, 0.358, 0, 0.85, 0.068, 0.80, '#af9d77', root)
  for (const y of [0.52, 0.77, 1.0]) meshes.box(0, y, 0, 0.79, 0.24, 0.70, light ? '#d9cda3' : '#c6b984', root)
  for (const y of [0.64, 0.884]) meshes.box(0, y, 0.352, 0.755, 0.036, 0.033, '#969479', root)
  meshes.box(0, landingBoard.y, landingBoard.z, 0.59, landingBoard.height, 0.154, wood, root)
  meshes.box(0, honeyHiveEntrance.y, 0.356, honeyHiveEntrance.width, 0.065, 0.024, '#4b4b3a', root)
  for (const x of [-0.41, 0.41]) meshes.box(x, 0.78, 0, 0.042, 0.078, 0.33, darkWood, root)
  const roof = meshes.box(0, 1.16, 0, 0.95, 0.117, 0.86, light ? '#557b73' : '#6f9180', root)
  roof.rotation.x = 0.076
  meshes.batchModel(root)
}

export function buildHoneyKit(meshes: MeshFactory, kit: TransformNode) {
  bench(meshes, kit, 0.92, 0.53)
  jar(meshes, kit, false, -0.22, 0.813)
  meshes.cylinder(0.18, 0.83, 0.02, 0.23, 0.23, 0.023, 12, cream, kit)
  meshes.sphere(0.18, 0.877, 0.02, 0.16, 0.14, 0.16, '#d7c496', kit, false)
  meshes.batchModel(kit)
}

export function buildHoneyExtractor(meshes: MeshFactory, extraction: TransformNode) {
  bench(meshes, extraction, 1.45, 0.65)
  for (const x of [-0.82, 0.82]) meshes.box(x, 1.04, -0.32, 0.086, 2.08, 0.09, darkWood, extraction)
  meshes.box(0, 2.10, -0.035, 1.94, 0.10, 1.03, '#91a58a', extraction).rotation.x = 0.14
  meshes.cylinder(-0.33, 1.04, -0.04, 0.41, 0.36, 0.45, 14, copper, extraction)
  meshes.cylinder(-0.33, 1.274, -0.04, 0.39, 0.40, 0.041, 14, '#b0aa93', extraction)
  meshes.box(-0.27, 1.355, -0.036, 0.34, 0.034, 0.035, darkWood, extraction)
  meshes.cylinder(-0.105, 1.388, -0.036, 0.046, 0.046, 0.09, 8, cream, extraction)
  meshes.box(-0.33, 0.94, 0.186, 0.06, 0.045, 0.155, '#b99467', extraction)
  jar(meshes, extraction, true, -0.33, 0.813, 0.247)
  const comb = new TransformNode('Capped honeycomb frame', meshes.scene)
  comb.parent = extraction
  comb.position.set(0.34, 1.016, -0.04)
  comb.rotation.x = -0.32
  meshes.box(0, 0, 0, 0.39, 0.34, 0.042, '#b9895d', comb)
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
    const cell = meshes.cylinder((col - 2) * 0.065 + row % 2 * 0.023, (row - 1.5) * 0.065, 0.022, 0.064, 0.064, 0.017, 6, (row + col) % 4 === 0 ? '#e5ab45' : '#f2cc78', comb, false)
    cell.rotation.x = Math.PI / 2
  }
  meshes.batchModel(extraction)
}

export function createHoneyGearModels(meshes: MeshFactory, crew: TransformNode) {
  const veil = new TransformNode('Loaned beekeeping veil', meshes.scene)
  veil.parent = crew
  const mesh = createIslandMaterial(meshes.scene, 'Veil mesh', '#524d3d')
  mesh.alpha = 0.25
  meshes.cylinder(0, 1.76, 0.027, 0.57, 0.68, 0.22, 13, cream, veil, false)
  meshes.cylinder(0, 1.63, 0.034, 0.76, 0.76, 0.061, 13, '#d5bb87', veil, false)
  meshes.cylinder(0, 1.445, 0.052, 0.67, 0.60, 0.365, 13, mesh, veil, false)
  meshes.cylinder(0, 1.25, 0.052, 0.591, 0.605, 0.042, 13, '#d5bb87', veil, false)
  const carriedJar = [-0.42, 0.995, 0.50] as const
  const empty = jar(meshes, crew, false, ...carriedJar)
  const filled = jar(meshes, crew, true, ...carriedJar)
  return { veil, empty, filled }
}
