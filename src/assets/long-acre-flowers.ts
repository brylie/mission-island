import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { longAcreFlowerGeometry } from './geometry/long-acre-flowers'

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
  const { centre, leaf, petal, stem } = longAcreFlowerGeometry
  return offsets.map(({ x, z, height }, i) => {
    const root = new TransformNode(bed.name, meshes.scene)
    const flowerX = bed.x + x, flowerZ = bed.z + z
    root.position.set(flowerX, surfaceHeight(flowerX, flowerZ), flowerZ)
    meshes.box(0, height * stem.centreHeight, 0, stem.width, height, stem.depth, '#56804d', root, false)
    const leafColor = longAcreLeafColors[(i + bedIndex) % longAcreLeafColors.length]
    meshes.sphere(leaf.x, height * leaf.heightRatio, 0, ...leaf.size, leafColor, root, false, leaf.segments).rotation.z = leaf.tilt
    for (let k = 0; k < petal.count; k++) {
      const a = k * Math.PI * petal.angleStepInPi
      meshes.sphere(petal.radius * Math.cos(a), height, petal.radius * Math.sin(a), ...petal.size, bed.petals, root, false, petal.segments)
    }
    meshes.sphere(0, height + centre.rise, 0, ...centre.size, bedIndex === 1 ? '#935b37' : '#e9ac53', root, false, centre.segments)
    return root
  })
}
