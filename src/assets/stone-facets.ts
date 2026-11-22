import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { MeshFactory } from '../island-meshes'

const coordinatesPerVertex = 3
const firstTriangleEnd = 2

export type Corner = [number, number, number]

// Keep fracture faces flat. Project top faces in plan and steep faces in
// elevation so the grain retains its scale around a broken edge.
export function facetBatch() {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], colors: number[] = []
  return {
    face(corners: Corner[], shade: number, phase = 0) {
      const first = positions.length / coordinatesPerVertex
      const [a, b, c] = corners
      const ab = b.map((v, i) => v - a[i]), ac = c.map((v, i) => v - a[i])
      const nx = Math.abs(ab[1] * ac[2] - ab[2] * ac[1])
      const ny = Math.abs(ab[2] * ac[0] - ab[0] * ac[2])
      const nz = Math.abs(ab[0] * ac[1] - ab[1] * ac[0])
      for (const [x, y, z] of corners) {
        positions.push(x, y, z)
        if (ny >= nx && ny >= nz) uvs.push(x + phase, z)
        else uvs.push((nx > nz ? z : x) + phase, y)
        colors.push(shade, shade, shade, 1)
      }
      for (let i = firstTriangleEnd; i < corners.length; i++) indices.push(first, first + i - 1, first + i)
    },
    mesh(meshes: MeshFactory, name: string, material: Material, parent?: TransformNode) {
      const mesh = meshes.surface(name, positions, indices, material, parent, uvs)
      mesh.setVerticesData(VertexBuffer.ColorKind, colors)
      meshes.shadows.addShadowCaster(mesh, false)
      return parent ? mesh : mesh.freezeWorldMatrix()
    },
  }
}
