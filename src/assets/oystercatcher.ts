import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { coastalProfile } from './coastal-profiles'

export function createOystercatcher(meshes: MeshFactory) {
  const root = new TransformNode('Oystercatcher', meshes.scene)
  const body = new TransformNode('Breast and mantle', meshes.scene)
  body.parent = root
  body.position.y = .215
  const ink = '#37454a', white = '#f1e8ce'
  coastalProfile(meshes, body, 'Pale belly', white, [
    [-.21, .024, .012, .012], [-.11, .028, .066, .043], [.002, .02, .087, .077],
    [.093, .036, .074, .078], [.136, .064, .038, .041],
  ])
  for (const side of [-1, 1]) {
    const wing = coastalProfile(meshes, body, 'Folded wing', ink, [
      [-.245, .027, .002, .003], [-.13, .043, .032, .027], [-.02, .055, .054, .046], [.05, .064, .041, .050], [.081, .067, .014, .025], [.087, .067, .002, .010],
    ])
    wing.position.x = side * .046
    wing.rotation.y = side * .14
    meshes.cylinder(side * .042, .115, .013, .014, .010, .22, 8, '#be806c', root)
    for (const spread of [-.52, 0, .52]) {
      const toe = meshes.sphere(side * .042 + .018 * Math.sin(spread), .009, .042, .009, .010, .073, '#bd816e', root, false, 3)
      toe.rotation.y = spread
    }
  }
  coastalProfile(meshes, body, 'Dark mantle and bib', ink, [
    [-.17,.053,.006,.005], [-.075,.071,.059,.023], [.021,.078,.073,.041], [.088,.069,.068,.059], [.13,.057,.031,.050],
  ])
  const head = new TransformNode('Peck pivot', meshes.scene)
  head.parent = body
  head.position.set(0, .058, .075)
  coastalProfile(meshes, head, 'Dark hood', ink, [
    [-.056, .034, .024, .036], [-.032, .046, .050, .057], [.002, .061, .061, .065], [.032, .067, .061, .060], [.059, .066, .046, .049], [.079, .06, .023, .028], [.086, .06, .010, .014],
  ])
  coastalProfile(meshes, head, 'Chisel bill', '#df783c', [
    [.069, .059, .021, .022], [.10, .055, .017, .014], [.205, .049, .005, .007],
  ], 8)
  for (const side of [-1, 1]) {
    meshes.sphere(side * .054, .084, .038, .013, .025, .025, '#db9350', head, false, 5)
    meshes.sphere(side * .061, .084, .039, .007, .013, .013, '#202a2a', head, false, 5)
  }
  return (time: number, feeding: boolean) => {
    const dip = feeding ? Math.max(0, Math.sin(time * 2.2)) ** 3 : 0
    body.rotation.x = .08 + .84 * dip
    head.rotation.x = .78 * dip
    head.rotation.y = (1 - dip) * .19 * Math.sin(time * 1.4)
  }
}
