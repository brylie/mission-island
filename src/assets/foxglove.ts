import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { coastalProfile } from './coastal-profiles'

export function createFoxglove(meshes: MeshFactory, seed: number) {
  const random = seededRandom(Math.imul(seed, 2654435761))
  const root = new TransformNode('Foxglove rosette', meshes.scene)
  const colors = ['#c3739b', '#d986ae', '#eba9be']
  const tall = 0.91 + random() * 0.21
  const turn = random() * Math.PI * 2
  for (let i = 0; i < 11; i++) {
    const leaf = coastalProfile(meshes, root, 'Creased basal leaf', i % 2 ? '#597448' : '#456947', [[0, 0.025, 0.006, 0.003], [0.12, 0.085, 0.049, 0.016], [0.24, 0.10, 0.064, 0.014], [0.34, 0.046, 0.034, 0.008], [0.395, 0.032, 0.002, 0.001]], 4)
    leaf.rotation.y = turn + i * 2.4
    leaf.scaling.scaleInPlace(0.74 + 0.38 * random())
    leaf.rotation.x = -0.16 * (i % 3)
  }
  const stem = new TransformNode('Flower spike', meshes.scene)
  stem.parent = root
  meshes.cylinder(0, tall / 2, 0, 0.009, 0.027, tall, 8, '#698454', stem)
  for (let i = 0; i < 14; i++) {
    const t = i / 13
    const bell = coastalProfile(meshes, stem, 'Foxglove bell', colors[i % 3], [
      [0, 0.012, 0.009, 0.009],
      [0.026, 0.019, 0.023, 0.025],
      [0.066, 0.003, 0.031, 0.032],
      [0.086, -0.027, 0.033, 0.031],
      [0.095, -0.037, 0.028, 0.024],
      [0.068, -0.022, 0.023, 0.020],
      [0.046, -0.007, 0.013, 0.011],
    ], 10)
    bell.position.y = tall * (0.37 + 0.61 * t)
    bell.rotation.y = turn + Math.sin(i * 1.78) * 1.38
    bell.rotation.x = 0.16 - 0.63 * t
    bell.scaling.scaleInPlace(1.44 - 1.05 * t)
  }
  return { root, sway(time: number) {
    stem.rotation.z = 0.026 * Math.sin(time * 1.6 + turn)
  } }
}
