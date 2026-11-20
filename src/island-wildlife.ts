import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'
import { seededRandom } from './scenery'
import { coastRadius, groundHeight, shoreShape, waterLevel } from './terrain'
import { island } from './world'

export function createWildflowers(meshes: MeshFactory) {
  const random = seededRandom(64286)
  const stems: number[] = []
  const blooms: number[] = []
  const centers: number[] = []
  function face(target: number[], x: number, y: number, z: number, angle: number, height: number, span: number) {
    const dx = Math.cos(angle) * span
    const dz = Math.sin(angle) * span
    target.push(x - dx, y, z - dz, x + dx, y, z + dz, x + dx * 1.25, y + height, z + dz * 1.25)
  }
  for (const [x, z] of [[-31, 18], [-17, 29], [28, -25], [37, -23]]) {
    for (let i = 0; i < 23; i++) {
      const point = { x: x + (random() - 0.5) * 11, z: z + (random() - 0.5) * 7 }
      if (coastRadius(point) > 0.93) continue
      const y = groundHeight(point)
      const angle = random() * Math.PI
      const height = 0.19 + random() * 0.28
      face(stems, point.x, y - 0.015, point.z, angle, height, 0.052)
      face(stems, point.x, y - 0.015, point.z, angle + Math.PI / 2, height * 0.76, 0.045)
      for (let petal = 0; petal < 3; petal++) {
        face(blooms, point.x, y + height - 0.06, point.z, angle + 0.27 + petal * Math.PI / 3, 0.093, 0.08)
      }
      face(centers, point.x, y + height - 0.043, point.z, angle + 0.43, 0.069, 0.03)
    }
  }
  for (const [name, vertices, color] of [
    ['Wildflower stems', stems, '#527f57'], ['Wildflower petals', blooms, '#f1dda6'], ['Wildflower centers', centers, '#e3a348'],
  ] as const) {
    const paint = meshes.paint(color)
    paint.backFaceCulling = false
    meshes.surface(name, vertices, Array.from({ length: vertices.length / 3 }, (_, i) => i), paint).freezeWorldMatrix()
  }
}

export function createFishSchools(meshes: MeshFactory) {
  const fishColor = meshes.paint('#6daca9')
  fishColor.backFaceCulling = false
  const schools = [-2.32, -0.89, 1.19].map((angle) => {
    const root = new TransformNode('Fish school', meshes.scene)
    const positions: number[] = []
    const indices: number[] = []
    for (let i = 0; i < 6; i++) {
      const x = (i % 3 - 1) * 0.66
      const z = -Math.floor(i / 3) * 0.94 - Math.abs(x) * 0.43
      const scale = 0.68 + (i % 4) * 0.1
      const base = positions.length / 3
      const fish = [
        [0, 0, 0.39], [0.095, 0, 0.035], [0, 0.12, 0.02], [-0.095, 0, 0.035], [0, -0.085, 0.02],
        [0, 0, -0.29], [0, 0.105, -0.44], [0, -0.096, -0.44],
      ]
      positions.push(...fish.flatMap(([dx, dy, dz]) => [x + dx * scale, dy * scale, z + dz * scale]))
      indices.push(...[0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4,
        5, 6, 7].map((vertex) => base + vertex))
    }
    meshes.surface('Silver shallows fish', positions, indices, fishColor, root)
    return { root, angle }
  })
  function coastalPosition(angle: number, phase: number) {
    const path = angle + 0.135 * Math.sin(phase)
    const radius = shoreShape(path) * (1.037 + 0.008 * Math.cos(phase))
    return { x: Math.cos(path) * island.width / 2 * radius, z: Math.sin(path) * island.length / 2 * radius }
  }
  return (time: number) => {
    for (const { root, angle } of schools) {
      const phase = time * 0.19 + angle
      const here = coastalPosition(angle, phase)
      const ahead = coastalPosition(angle, phase + 0.01)
      root.position.set(here.x, waterLevel - 0.22 + Math.sin(time * 2 + angle) * 0.035, here.z)
      root.rotation.y = Math.atan2(ahead.x - here.x, ahead.z - here.z)
      root.rotation.z = Math.sin(time * 6 + angle) * 0.07
    }
  }
}
