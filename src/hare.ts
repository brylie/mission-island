import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { hareGeometry } from './assets/geometry/biome-fauna'
import type { MeshFactory } from './island-meshes'

export function createHare(meshes: MeshFactory, name: string, color: string) {
  const root = new TransformNode(name, meshes.scene)
  const { torso, head, ears, segments } = hareGeometry
  meshes.sphere(...torso, color, root, false, segments)
  meshes.sphere(...head, color, root, false, segments)
  const { base, tip } = ears
  for (const side of [-1, 1]) {
    const x = side * ears.x
    meshes.sphere(x, base.y, base.z, ...base.size, color, root, false, segments).rotation.x = ears.pitchRad
    meshes.sphere(x, tip.y, tip.z, ...tip.size, tip.color, root, false, segments).rotation.x = ears.pitchRad
  }
  return root
}
