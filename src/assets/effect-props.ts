import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { createIslandMaterial } from '../materials'

export function createOilLantern(meshes: MeshFactory) {
  const root = new TransformNode('Oil lantern', meshes.scene)
  const frame = '#434942'
  const glass = createIslandMaterial(meshes.scene, 'Lantern glass', '#eea75c', true)
  glass.alpha = .73
  const flame = meshes.sphere(0, .167, 0, .065, .147, .072, meshes.paint('#ffbf62', true), root, false)
  const globe = meshes.cylinder(0, .193, 0, .211, .22, .26, 9, glass, root, false)
  meshes.cylinder(0, .04, 0, .244, .28, .08, 10, frame, root)
  meshes.cylinder(0, .337, 0, .147, .261, .079, 10, frame, root)
  for (const x of [-.1, .1]) {
    for (const z of [-.064, .064]) meshes.box(x, .194, z, .025, .25, .025, frame, root)
  }
  meshes.box(0, .42, 0, .095, .065, .027, frame, root)
  return { root, flame, globe }
}

export function createProduceCarrot(meshes: MeshFactory, root: TransformNode) {
  const lower = meshes.cylinder(0, -.102, 0, .129, .027, .246, 7, '#d58142', root)
  lower.rotation.z = -.13
  meshes.sphere(0, .018, 0, .133, .081, .126, '#eb974f', root)
  for (const side of [-1, 1]) {
    meshes.sphere(side * .052, .144, 0, .07, .248, .052, '#789653', root).rotation.z = side * -.34
  }
}
