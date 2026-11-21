import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { createIslandMaterial } from '../materials'

export function createOilLantern(meshes: MeshFactory) {
  const root = new TransformNode('Oil lantern', meshes.scene)
  const frame = '#434942'
  const glass = createIslandMaterial(meshes.scene, 'Lantern glass', '#eea75c', true)
  glass.alpha = 0.73
  const flame = meshes.sphere(0, 0.167, 0, 0.065, 0.147, 0.072, meshes.paint('#ffbf62', true), root, false)
  const globe = meshes.cylinder(0, 0.193, 0, 0.211, 0.22, 0.26, 9, glass, root, false)
  meshes.cylinder(0, 0.04, 0, 0.244, 0.28, 0.08, 10, frame, root)
  meshes.cylinder(0, 0.337, 0, 0.147, 0.261, 0.079, 10, frame, root)
  for (const x of [-0.1, 0.1]) {
    for (const z of [-0.064, 0.064]) meshes.box(x, 0.194, z, 0.025, 0.25, 0.025, frame, root)
  }
  meshes.box(0, 0.42, 0, 0.095, 0.065, 0.027, frame, root)
  return { root, flame, globe }
}

export function createTimberSaw(meshes: MeshFactory) {
  const root = new TransformNode('Timber saw', meshes.scene)
  const wood = meshes.paintSurface('wood', '#a07e54')
  meshes.box(0, 0.84, 0.02, 2.42, 0.135, 1.16, wood, root)
  for (const x of [-0.96, 0.96]) {
    for (const z of [-0.4, 0.43]) meshes.box(x, 0.404, z, 0.135, 0.81, 0.15, '#746650', root)
  }
  meshes.box(-0.52, 0.952, 0, 1.18, 0.09, 0.37, '#cdab74', root)
  const arbor = new TransformNode('Saw arbor', meshes.scene)
  arbor.parent = root
  arbor.position.set(0.08, 1.01, -0.018)
  meshes.cylinder(0, 0, 0, 0.48, 0.48, 0.053, 22, '#a2b5b1', arbor).rotation.x = Math.PI / 2
  for (let tooth = 0; tooth < 14; tooth++) {
    const angle = tooth * Math.PI * 2 / 14
    const edge = meshes.box(0.247 * Math.sin(angle), 0.247 * Math.cos(angle), 0, 0.049, 0.079, 0.058, '#98a5a0', arbor)
    edge.rotation.z = -angle - 0.23
  }
  meshes.box(0.079, 0.158, 0.029, 0.035, 0.061, 0.008, '#556c69', arbor, false).name = 'Blade witness mark'
  const dustOffset = { x: 0.1, y: 1.12, z: 0.025 }
  return { root, dustOffset, pose(this: void, time: number) {
    // The cutting edge moves toward +X where it meets the stock and throws sawdust.
    arbor.rotation.z = -time * 12
  } }
}

export function createMillVent(meshes: MeshFactory) {
  const root = new TransformNode('Mill roof vent', meshes.scene)
  const lidHeight = 0.79
  meshes.cylinder(0, 0.06, 0, 0.46, 0.53, 1.55, 10, '#798985', root)
  meshes.cylinder(0, lidHeight, 0, 0.37, 0.43, 0.12, 10, '#545e55', root)
  return { root, outletHeight: lidHeight + 0.09 }
}
