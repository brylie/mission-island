import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { RescueGearKind } from '../rescue-gear'
import { firstAidKitModel, flashlightModel, radioModel, rescueGearScale, ringBuoyModel, ringBuoyScale, throwBagModel, whistleModel } from './geometry/rescue-gear'

const half = 0.5
const quarterTurn = Math.PI * half
const fullTurn = Math.PI + Math.PI

type Builder = (meshes: MeshFactory, node: TransformNode) => void

function firstAidKit({ box }: MeshFactory, node: TransformNode) {
  const { case: body, band, lid, cross, frontCross, handle, latch } = firstAidKitModel
  box(0, body.y, 0, ...body.size, body.color, node)
  box(0, band.y, 0, ...band.size, band.color, node)
  box(0, lid.y, 0, ...lid.size, lid.color, node)
  box(0, cross.y, 0, ...cross.bar, cross.color, node)
  box(0, cross.y, 0, ...cross.upright, cross.color, node)
  box(0, frontCross.y, frontCross.z, ...frontCross.bar, cross.color, node)
  box(0, frontCross.y, frontCross.z, ...frontCross.upright, cross.color, node)
  box(0, handle.y, handle.z, ...handle.size, handle.color, node)
  for (const side of [-1, 1]) box(side * latch.x, latch.y, latch.z, ...latch.size, latch.color, node)
}

function flashlight({ cylinder }: MeshFactory, node: TransformNode) {
  const { body, grip, head, lens, segments } = flashlightModel
  for (const part of [body, grip, head, lens]) {
    cylinder(0, part.y, part.z, part.diameter, part.diameter, part.length, segments, part.color, node).rotation.x = quarterTurn
  }
}

function throwBag({ cylinder, box }: MeshFactory, node: TransformNode) {
  const { bag, coil, hub, tail, toggle, segments } = throwBagModel
  for (const part of [bag, coil, hub]) cylinder(0, part.y, 0, part.diameter, part.diameter, part.height, segments, part.color, node)
  box(tail.x, tail.y, 0, ...tail.size, tail.color, node)
  box(toggle.x, toggle.y, 0, ...toggle.size, toggle.color, node)
}

function ringBuoy(meshes: MeshFactory, node: TransformNode) {
  const { ring, bands, line } = ringBuoyModel
  for (const part of [ring, line]) {
    const torus = CreateTorus('Ring buoy', { diameter: part.diameter, thickness: part.thickness, tessellation: part.segments }, meshes.scene)
    torus.position.y = part.y
    torus.material = meshes.paint(part.color)
    torus.isPickable = false
    torus.parent = node
    meshes.shadows.addShadowCaster(torus, false)
  }
  for (let i = 0; i < bands.count; i++) {
    const angle = (i + half) * fullTurn / bands.count
    meshes.box(bands.radius * Math.cos(angle), bands.y, bands.radius * Math.sin(angle), ...bands.size, bands.color, node).rotation.y = -angle
  }
}

function radio({ box, cylinder }: MeshFactory, node: TransformNode) {
  const { body, screen, keypad, antenna, knob, segments } = radioModel
  box(0, body.y, 0, ...body.size, body.color, node)
  box(0, screen.y, screen.z, ...screen.size, screen.color, node)
  box(0, keypad.y, keypad.z, ...keypad.size, keypad.color, node)
  cylinder(antenna.x, antenna.y, 0, antenna.diameter, antenna.diameter, antenna.height, segments, antenna.color, node)
  cylinder(knob.x, knob.y, 0, knob.diameter, knob.diameter, knob.height, segments, knob.color, node)
}

function whistle({ box, cylinder }: MeshFactory, node: TransformNode) {
  const { barrel, mouthpiece, ring, lanyard, segments } = whistleModel
  box(0, barrel.y, 0, ...barrel.size, barrel.color, node)
  box(0, mouthpiece.y, mouthpiece.z, ...mouthpiece.size, mouthpiece.color, node)
  cylinder(0, ring.y, ring.z, ring.diameter, ring.diameter, ring.height, segments, ring.color, node).rotation.x = quarterTurn
  box(0, lanyard.y, lanyard.z, ...lanyard.size, lanyard.color, node)
}

const builders: Record<RescueGearKind, Builder> = {
  'first-aid': firstAidKit,
  'flashlight': flashlight,
  'throw-bag': throwBag,
  'ring-buoy': ringBuoy,
  'radio': radio,
  'whistle': whistle,
}

// The item node holds a scaled model so gear reads from the chase camera.
export function createRescueGear(meshes: MeshFactory, kind: RescueGearKind) {
  const node = new TransformNode(kind, meshes.scene)
  const model = new TransformNode(`${kind} model`, meshes.scene)
  model.parent = node
  model.scaling.setAll(kind === 'ring-buoy' ? ringBuoyScale : rescueGearScale)
  builders[kind](meshes, model)
  return node
}
