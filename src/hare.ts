import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'

export function createHare(meshes: MeshFactory, name: string, color: string) {
  const root = new TransformNode(name, meshes.scene)
  const part = (x: number, y: number, z: number, w: number, h: number, d: number) =>
    meshes.sphere(x, y, z, w, h, d, color, root, false, 6)
  part(0, .05, 0, .33, .25, .78)
  part(0, .18, .23, .29, .35, .35)
  for (const side of [-1, 1]) part(side * .071, .39, .19, .08, .28, .095).rotation.x = -.24
  return root
}
