import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { harvestedCarrot } from './geometry/harvested-carrot'

const half = 0.5

export function buildHarvestedCarrot({ box, cylinder }: MeshFactory, root: TransformNode) {
  const { root: shape, leaves } = harvestedCarrot
  cylinder(0, 0, 0, shape.topDiameter, shape.tipDiameter, shape.length, shape.segments, shape.color, root).rotation.x = Math.PI * half
  const [x, y, z] = leaves.center
  for (const side of [-1, 1]) {
    box(side * x, y, z, ...leaves.size, leaves.color, root).rotation.set(leaves.pitch, side * leaves.fan, 0)
  }
}
