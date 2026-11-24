import type { Material } from '@babylonjs/core/Materials/material'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { beachAttribute, beachAttributeSize, groundCoverAttribute } from './beach-material'
import type { MeshFactory } from './island-meshes'

// Generated terrain tiles: one tile's full vertex grid, drawn whole near the camera and from
// every other vertex further off.

const vertexStride = 3
const uvStride = 2
const colorStride = 4
const beachStride = 4

interface TileData { positions: number[], normals: number[], uvs: number[], colors: number[], beach: number[], cover: number[] }

// A tile's mesh from every `stride`th vertex of its full grid; a cell is drawn when any of its
// corners is generated ground.
export function tileMesh(meshes: MeshFactory, material: Material, data: TileData, keep: boolean[], steps: number, stride: number) {
  const row = steps + 1, kept = Math.floor(steps / stride) + 1
  const pick = (values: number[], size: number) => {
    const out: number[] = []
    for (let j = 0; j < kept; j++) for (let i = 0; i < kept; i++) out.push(...values.slice((j * stride * row + i * stride) * size, (j * stride * row + i * stride + 1) * size))
    return out
  }
  const at = (i: number, j: number) => keep[j * stride * row + i * stride]
  const indices: number[] = []
  for (let j = 0; j < kept - 1; j++) {
    for (let i = 0; i < kept - 1; i++) {
      const a = j * kept + i, b = a + 1, c = a + kept, d = c + 1
      if (at(i, j) || at(i + 1, j) || at(i, j + 1) || at(i + 1, j + 1)) indices.push(a, b, d, a, d, c)
    }
  }
  if (!indices.length) return undefined
  const mesh = meshes.surface('Highwood terrain', pick(data.positions, vertexStride), indices, material, undefined, pick(data.uvs, uvStride), pick(data.normals, vertexStride))
  mesh.setVerticesData(VertexBuffer.ColorKind, pick(data.colors, colorStride))
  mesh.setVerticesData(beachAttribute, pick(data.beach, beachStride), false, beachAttributeSize)
  mesh.setVerticesData(groundCoverAttribute, pick(data.cover, beachStride), false, beachAttributeSize)
  mesh.freezeWorldMatrix()
  return mesh
}
