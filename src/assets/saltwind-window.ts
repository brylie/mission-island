import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { saltwindWindowGeometry } from './geometry/saltwind-window'

export { saltwindWindowRain, saltwindWindowRow } from './geometry/saltwind-window'

const trim = '#f8e2b9'
const glass = '#426e73'

export function createSaltwindWindow(meshes: MeshFactory, root: TransformNode, x: number, y: number, z: number) {
  const { frame, glazing, mullion, sill } = saltwindWindowGeometry
  meshes.box(x, y, z, ...frame.size, trim, root)
  meshes.box(x, y, z + glazing.z, ...glazing.size, glass, root)
  meshes.box(x, y, z + mullion.z, ...mullion.size, trim, root)
  meshes.box(x, y + sill.y, z + sill.z, ...sill.size, '#b69e79', root)
}
