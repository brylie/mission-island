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

export function createTimberSaw(meshes: MeshFactory) {
  const root = new TransformNode('Timber saw', meshes.scene)
  const wood = meshes.paintSurface('wood', '#a07e54')
  meshes.box(0, .84, .02, 2.42, .135, 1.16, wood, root)
  for (const x of [-.96, .96]) {
    for (const z of [-.4, .43]) meshes.box(x, .404, z, .135, .81, .15, '#746650', root)
  }
  meshes.box(-.52, .952, 0, 1.18, .09, .37, '#cdab74', root)
  const arbor = new TransformNode('Saw arbor', meshes.scene)
  arbor.parent = root
  arbor.position.set(.08, 1.01, -.018)
  meshes.cylinder(0, 0, 0, .48, .48, .053, 22, '#a2b5b1', arbor).rotation.x = Math.PI / 2
  for (let tooth = 0; tooth < 14; tooth++) {
    const angle = tooth * Math.PI * 2 / 14
    const edge = meshes.box(.247 * Math.sin(angle), .247 * Math.cos(angle), 0,
      .049, .079, .058, '#98a5a0', arbor)
    edge.rotation.z = -angle - .23
  }
  meshes.box(.079, .158, .029, .035, .061, .008, '#556c69', arbor, false).name = 'Blade witness mark'
  return { root, pose(this: void, time: number) {
    // The cutting edge moves toward +X where it meets the stock and throws sawdust.
    arbor.rotation.z = -time * 12
  } }
}
