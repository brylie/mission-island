import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { coastalProfile } from './coastal-profiles'

// A continuous hairline rises at the forehead and dips at the nape. The locks tuck under a work cap.
export function createCrewHair(meshes: MeshFactory, root: TransformNode) {
  const hair = '#493932', vertices: number[] = [], indices: number[] = []
  const sides = 24
  for (const [row, [width, depth, height, dip]] of [
    [.244, .207, 1.609, .149], [.255, .218, 1.658, .099], [.248, .216, 1.704, .046],
    [.208, .184, 1.754, 0], [.116, .111, 1.781, 0], [.004, .004, 1.789, 0],
  ].entries()) {
    for (let i = 0; i < sides; i++) {
      const a = i * 2 * Math.PI / sides, forward = Math.sin(a)
      const side = Math.cos(a), t = (1 - forward) / 2
      const hairline = height - dip * (t + .18 * Math.abs(side) ** 12 + .052 * Math.sin(5 * a + .4))
      vertices.push(width * Math.sign(side) * Math.abs(side) ** .73, hairline,
        .015 + depth * Math.sign(forward) * Math.abs(forward) ** .73)
      if (row === 0) continue
      const b = (row - 1) * sides + i, c = (row - 1) * sides + (i + 1) % sides
      indices.push(b, c, b + sides, c, c + sides, b + sides)
    }
  }
  const scalp = meshes.surface('Hairline and nape', vertices, indices, hair, root)
  meshes.shadows.addShadowCaster(scalp, false)
  const locks = [-1, 0, 1].map((i) => {
    const lock = coastalProfile(meshes, root, 'Swept forelock', i === 0 ? '#624838' : '#503a2e', [
      [-.12, .011, .025, .023], [-.06, .024, .062, .055], [.032, .023, .075, .058],
      [.112, -.012, .056, .041], [.17, -.062, .009, .009],
    ])
    lock.position.set(i * .089 - .011, 1.719 + .025 * i, .134 - .034 * Math.abs(i))
    lock.rotation.y = -.66 + .12 * i
    return lock
  })
  return (wearingCap: boolean) => {
    scalp.scaling.set(wearingCap ? .95 : 1, wearingCap ? .82 : 1, wearingCap ? .92 : 1)
    scalp.position.y = wearingCap ? 1.49 * .18 : 0
    for (const lock of locks) lock.setEnabled(!wearingCap)
  }
}
