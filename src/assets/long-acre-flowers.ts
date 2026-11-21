import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'

type FlowerBed = { x: number, z: number, name: string, petals: string }
type FlowerOffset = { x: number, z: number, height: number }

export const longAcreLeafColors = ['#627e52', '#7d975a', '#91a567'] as const
export const longAcrePollenHeight = 0.45

export function createLongAcreFlowers(
  meshes: MeshFactory,
  bed: FlowerBed,
  bedIndex: number,
  offsets: readonly FlowerOffset[],
  surfaceHeight: (x: number, z: number) => number,
) {
  return offsets.map(({ x, z, height }, i) => {
    const root = new TransformNode(bed.name, meshes.scene)
    const flowerX = bed.x + x, flowerZ = bed.z + z
    root.position.set(flowerX, surfaceHeight(flowerX, flowerZ), flowerZ)
    meshes.box(0, height / 2, 0, 0.028, height, 0.034, '#56804d', root, false)
    meshes.sphere(0.052, height * 0.56, 0, 0.138, 0.042, 0.071, longAcreLeafColors[(i + bedIndex) % 3], root, false, 4).rotation.z = 0.49
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 0.4
      meshes.sphere(0.069 * Math.cos(a), height, 0.069 * Math.sin(a), 0.117, 0.066, 0.112, bed.petals, root, false, 5)
    }
    meshes.sphere(0, height + 0.017, 0, 0.087, 0.061, 0.086, bedIndex === 1 ? '#935b37' : '#e9ac53', root, false, 5)
    return root
  })
}
