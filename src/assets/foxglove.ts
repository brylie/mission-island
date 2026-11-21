import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { coastalProfile } from './coastal-profiles'

export function createFoxglove(meshes: MeshFactory, seed: number) {
  const random = seededRandom(Math.imul(seed, 2654435761))
  const root = new TransformNode('Foxglove rosette', meshes.scene)
  const colors = ['#c3739b', '#d986ae', '#eba9be']
  const tall = .91 + random() * .21
  const turn = random() * Math.PI * 2
  for (let i = 0; i < 11; i++) {
    const leaf = coastalProfile(meshes, root, 'Creased basal leaf', i % 2 ? '#597448' : '#456947',
      [[0, .025, .006, .003], [.12, .085, .049, .016], [.24, .10, .064, .014], [.34, .046, .034, .008], [.395, .032, .002, .001]], 4)
    leaf.rotation.y = turn + i * 2.4
    leaf.scaling.scaleInPlace(.74 + .38 * random())
    leaf.rotation.x = -.16 * (i % 3)
  }
  const stem = new TransformNode('Flower spike', meshes.scene)
  stem.parent = root
  meshes.cylinder(0, tall / 2, 0, .009, .027, tall, 8, '#698454', stem)
  for (let i = 0; i < 14; i++) {
    const t = i / 13
    const bell = coastalProfile(meshes, stem, 'Foxglove bell', colors[i % 3], [
      [0, .012, .009, .009], [.026, .019, .023, .025], [.066, .003, .031, .032],
      [.086, -.027, .033, .031], [.095, -.037, .028, .024], [.068, -.022, .023, .020],
      [.046, -.007, .013, .011],
    ], 10)
    bell.position.y = tall * (.37 + .61 * t)
    bell.rotation.y = turn + Math.sin(i * 1.78) * 1.38
    bell.rotation.x = .16 - .63 * t
    bell.scaling.scaleInPlace(1.44 - 1.05 * t)
  }
  return { root, sway(time: number) { stem.rotation.z = .026 * Math.sin(time * 1.6 + turn) } }
}
