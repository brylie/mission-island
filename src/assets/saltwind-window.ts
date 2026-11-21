import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'

const trim = '#f8e2b9'
const glass = '#426e73'
const glassDepth = 0.044
const glassOffset = 0.064
export const saltwindWindowRow = { centreY: 1.95, edgeFraction: 0.31 } as const
export const saltwindWindowRain = {
  y: saltwindWindowRow.centreY + 0.11,
  z: glassOffset + glassDepth / 2 + 0.062,
  floor: saltwindWindowRow.centreY - 0.5,
} as const

export function createSaltwindWindow(meshes: MeshFactory, root: TransformNode, x: number, y: number, z: number) {
  const width = 1.4
  meshes.box(x, y, z, width + 0.16, 1.28, 0.11, trim, root)
  meshes.box(x, y, z + glassOffset, width, 1.08, glassDepth, glass, root)
  meshes.box(x, y, z + 0.091, 0.065, 1.09, 0.038, trim, root)
  meshes.box(x, y - 0.64, z + 0.10, width + 0.24, 0.12, 0.29, '#b69e79', root)
}
