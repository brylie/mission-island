import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { createIslandMaterial } from '../materials'
import { millVentModel, oilLanternModel, timberSawModel } from './geometry/effect-props'

const half = 0.5
const quarterTurn = Math.PI * half
const fullTurn = Math.PI + Math.PI
const sawRadiansPerSecond = 12

export function createOilLantern(meshes: MeshFactory) {
  const root = new TransformNode('Oil lantern', meshes.scene)
  const { frame, glass: globeModel, flame: flameModel, base, cap, frameSides, bars, handle } = oilLanternModel
  const glass = createIslandMaterial(meshes.scene, 'Lantern glass', globeModel.color, true)
  glass.alpha = globeModel.opacity
  const flame = meshes.sphere(0, flameModel.y, 0, ...flameModel.size, meshes.paint(flameModel.color, true), root, false)
  const globe = meshes.cylinder(0, globeModel.y, 0, globeModel.top, globeModel.bottom, globeModel.height, globeModel.sides, glass, root, false)
  meshes.cylinder(0, base.y, 0, base.top, base.bottom, base.height, frameSides, frame, root)
  meshes.cylinder(0, cap.y, 0, cap.top, cap.bottom, cap.height, frameSides, frame, root)
  for (const x of bars.x) for (const z of bars.z) meshes.box(x, bars.y, z, ...bars.size, frame, root)
  meshes.box(0, handle.y, 0, ...handle.size, frame, root)
  return { root, flame, globe }
}

export function createTimberSaw(meshes: MeshFactory) {
  const root = new TransformNode('Timber saw', meshes.scene)
  const { table, legs, stock, blade, teeth, witness, dustOffset } = timberSawModel
  const wood = meshes.paintSurface('wood', table.color)
  meshes.box(0, table.y, table.z, ...table.size, wood, root)
  for (const x of legs.x) for (const z of legs.z) meshes.box(x, legs.y, z, ...legs.size, legs.color, root)
  meshes.box(stock.x, stock.y, 0, ...stock.size, stock.color, root)
  const arbor = new TransformNode('Saw arbor', meshes.scene)
  arbor.parent = root
  arbor.position.set(...timberSawModel.arbor)
  meshes.cylinder(0, 0, 0, blade.diameter, blade.diameter, blade.thickness, blade.sides, blade.color, arbor).rotation.x = quarterTurn
  for (let tooth = 0; tooth < teeth.count; tooth++) {
    const angle = tooth * fullTurn / teeth.count
    const edge = meshes.box(teeth.radius * Math.sin(angle), teeth.radius * Math.cos(angle), 0, ...teeth.size, teeth.color, arbor)
    edge.rotation.z = -angle - teeth.rake
  }
  meshes.box(...witness.center, ...witness.size, witness.color, arbor, false).name = 'Blade witness mark'
  return { root, dustOffset, pose(this: void, time: number) {
    // The cutting edge moves toward +X where it meets the stock and throws sawdust.
    arbor.rotation.z = -time * sawRadiansPerSecond
  } }
}

export function createMillVent(meshes: MeshFactory) {
  const root = new TransformNode('Mill roof vent', meshes.scene)
  const { pipe, lid, sides, outletHeight } = millVentModel
  meshes.cylinder(0, pipe.y, 0, pipe.top, pipe.bottom, pipe.height, sides, pipe.color, root)
  meshes.cylinder(0, lid.y, 0, lid.top, lid.bottom, lid.height, sides, lid.color, root)
  return { root, outletHeight }
}
