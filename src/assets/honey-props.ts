import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { createIslandMaterial } from '../materials'
import { beekeepingGear, honeyBench, honeyExtractor, honeyHive, honeyJar, honeyKit, honeyPropPaint, honeyShelf } from './geometry/honey-props'

const { cream, wood, darkWood } = honeyPropPaint
const { landingBoard, entrance } = honeyHive
const half = 0.5
const quarterTurn = Math.PI * half

export const honeyHiveEntrance = { ...entrance, floor: landingBoard.y + landingBoard.height * half } as const

function jar(meshes: MeshFactory, parent: TransformNode, filled: boolean, x = 0, y = 0, z = 0) {
  const root = new TransformNode(filled ? 'Capped honey jar' : 'Clean jar', meshes.scene)
  root.parent = parent
  root.position.set(x, y, z)
  const paint = filled ? honeyJar.filled : honeyJar.empty
  meshes.cylinder(...honeyJar.body, paint.body, root, false)
  meshes.cylinder(...honeyJar.lid, paint.lid, root, false)
  meshes.box(...honeyJar.label, cream, root, false)
  meshes.box(...honeyJar.highlight, honeyJar.highlightColor, root, false)
  return root
}

function bench(meshes: MeshFactory, root: TransformNode, { width, depth }: { width: number, depth: number }) {
  const { topY, topThickness, leg } = honeyBench
  meshes.box(0, topY, 0, width, topThickness, depth, wood, root)
  const legX = width * half - leg.insetX
  const legZ = depth * half - leg.insetZ
  for (const x of [-legX, legX]) for (const z of [-legZ, legZ]) {
    meshes.box(x, leg.y, z, ...leg.size, darkWood, root)
  }
}

export function buildHoneyShelf(meshes: MeshFactory, root: TransformNode, reward: number) {
  const { priceCard } = honeyShelf
  bench(meshes, root, honeyShelf.bench)
  for (const x of honeyShelf.jar.x) jar(meshes, root, true, x, honeyShelf.jar.y)
  const card = meshes.box(...priceCard.backing, cream, root)
  card.rotation.x = priceCard.tilt
  const label = new DynamicTexture('Honey shelf price', priceCard.textureSize, meshes.scene, true)
  label.drawText('HONEY', null, priceCard.title.y, priceCard.title.font, priceCard.ink, priceCard.paper, false)
  label.drawText(reward + ' COINS', null, priceCard.price.y, priceCard.price.font, priceCard.ink, null, true)
  const print = new StandardMaterial('Honey price card', meshes.scene)
  print.diffuseTexture = label
  print.backFaceCulling = false
  const face = new TransformNode('Price card face', meshes.scene)
  face.position.copyFrom(card.position)
  face.rotation.copyFrom(card.rotation)
  face.parent = root
  meshes.surface('Honey price', [...priceCard.face.positions], [...priceCard.face.indices], print, face, [...priceCard.face.uvs])
  meshes.batchModel(root)
}

export function buildHoneyHive(meshes: MeshFactory, root: TransformNode, variant: 'light' | 'dark') {
  const { feet, base, tiers, trim, entranceSlot, grips, roof } = honeyHive
  const paint = honeyHive.paint[variant]
  for (const x of feet.x) meshes.box(x, feet.y, 0, ...feet.size, darkWood, root)
  meshes.box(...base.box, base.color, root)
  for (const y of tiers.y) meshes.box(0, y, 0, ...tiers.size, paint.body, root)
  for (const y of trim.y) meshes.box(0, y, trim.z, ...trim.size, trim.color, root)
  meshes.box(0, landingBoard.y, landingBoard.z, landingBoard.width, landingBoard.height, landingBoard.depth, wood, root)
  meshes.box(0, entrance.y, entranceSlot.z, entrance.width, entranceSlot.height, entranceSlot.depth, entranceSlot.color, root)
  for (const x of grips.x) meshes.box(x, grips.y, 0, ...grips.size, darkWood, root)
  meshes.box(...roof.box, paint.roof, root).rotation.x = roof.tilt
  meshes.batchModel(root)
}

export function buildHoneyKit(meshes: MeshFactory, kit: TransformNode) {
  bench(meshes, kit, honeyKit.bench)
  jar(meshes, kit, false, ...honeyKit.jar)
  meshes.cylinder(...honeyKit.brim, cream, kit)
  meshes.sphere(...honeyKit.hat.shape, honeyKit.hat.color, kit, false)
  meshes.batchModel(kit)
}

export function buildHoneyExtractor(meshes: MeshFactory, extraction: TransformNode) {
  const { posts, awning, drum, lid, crank, knob, spout, comb } = honeyExtractor
  bench(meshes, extraction, honeyExtractor.bench)
  for (const x of posts.x) meshes.box(x, posts.y, posts.z, ...posts.size, darkWood, extraction)
  meshes.box(...awning.box, awning.color, extraction).rotation.x = awning.tilt
  meshes.cylinder(...drum.shape, drum.color, extraction)
  meshes.cylinder(...lid.shape, lid.color, extraction)
  meshes.box(...crank, darkWood, extraction)
  meshes.cylinder(...knob, cream, extraction)
  meshes.box(...spout.box, spout.color, extraction)
  jar(meshes, extraction, true, ...honeyExtractor.jar)
  const frame = new TransformNode('Capped honeycomb frame', meshes.scene)
  frame.parent = extraction
  frame.position.set(...comb.position)
  frame.rotation.x = comb.tilt
  meshes.box(...comb.frame.box, comb.frame.color, frame)
  const { cell } = comb
  const centerColumn = (cell.columns - 1) * half
  const centerRow = (cell.rows - 1) * half
  for (let row = 0; row < cell.rows; row++) for (let column = 0; column < cell.columns; column++) {
    const x = (column - centerColumn) * cell.spacing + row % cell.staggerPeriod * cell.stagger
    const y = (row - centerRow) * cell.spacing
    const color = (row + column) % cell.darkCellInterval === 0 ? cell.amber : cell.gold
    meshes.cylinder(x, y, cell.z, cell.diameter, cell.diameter, cell.thickness, cell.sides, color, frame, false).rotation.x = quarterTurn
  }
  meshes.batchModel(extraction)
}

export function createHoneyGearModels(meshes: MeshFactory, crew: TransformNode) {
  const gear = beekeepingGear
  const veil = new TransformNode('Loaned beekeeping veil', meshes.scene)
  veil.parent = crew
  const net = createIslandMaterial(meshes.scene, 'Veil mesh', gear.netMaterial.color)
  net.alpha = gear.netMaterial.opacity
  meshes.cylinder(...gear.crown, cream, veil, false)
  meshes.cylinder(...gear.brim, gear.bindingColor, veil, false)
  meshes.cylinder(...gear.net, net, veil, false)
  meshes.cylinder(...gear.collar, gear.bindingColor, veil, false)
  const empty = jar(meshes, crew, false, ...gear.jar)
  const filled = jar(meshes, crew, true, ...gear.jar)
  return { veil, empty, filled }
}
