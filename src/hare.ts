import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'

export function createHare(meshes: MeshFactory, name: string, color: string) {
  const root = new TransformNode(name, meshes.scene)
  const part = (x: number, y: number, z: number, w: number, h: number, d: number) =>
    meshes.sphere(x, y, z, w, h, d, color, root, false, 6)
  part(0, 0.05, 0, 0.33, 0.25, 0.78)
  part(0, 0.18, 0.23, 0.29, 0.35, 0.35)
  for (const side of [-1, 1]) {
    part(side * 0.071, 0.39, 0.19, 0.08, 0.28, 0.095).rotation.x = -0.24
    meshes.sphere(side * 0.071, 0.484, 0.167, 0.061, 0.095, 0.071, '#494039', root, false, 6).rotation.x = -0.24
  }
  return root
}
