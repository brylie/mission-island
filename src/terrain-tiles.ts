import type { Material } from '@babylonjs/core/Materials/material'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { beachAttribute, beachAttributeSize, groundCoverAttribute } from './beach-material'
import type { MeshFactory } from './island-meshes'
import { clipOutsideRoads } from './clip-under-roads'
import { roadSurfaceModel } from './assets/geometry/route-profiles'

// Generated terrain tiles: one tile's full vertex grid, drawn whole near the camera and from
// every other vertex further off.

const vertexStride = 3
const uvStride = 2
const colorStride = 4
const beachStride = 4
// How far a tile's border skirt hangs below its edge.
const skirtDropM = 1

interface TileData { positions: number[], normals: number[], uvs: number[], colors: number[], beach: number[], cover: number[], field: number[] }

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
  const layers = [
    { values: pick(data.positions, vertexStride), size: vertexStride },
    { values: pick(data.uvs, uvStride), size: uvStride },
    { values: pick(data.normals, vertexStride), size: vertexStride },
    { values: pick(data.colors, colorStride), size: colorStride },
    { values: pick(data.beach, beachStride), size: beachStride },
    { values: pick(data.cover, beachStride), size: beachStride },
  ]
  const field = pick(data.field, 1)
  // A skirt hangs from the tile's border, so where a near tile meets a far one, or the ground
  // isn't exactly the bake's between far vertices, no crack shows between them.
  const copy = (v: number, drop: number) => {
    const index = field.length
    layers.forEach((layer, n) => {
      for (let k = 0; k < layer.size; k++) layer.values.push(layer.values[v * layer.size + k] - (n === 0 && k === 1 ? drop : 0))
    })
    field.push(field[v])
    return index
  }
  const last = kept - 1
  for (let k = 0; k < last; k++) {
    // Each border edge: its two vertices, and the cell inside them.
    const edges: [number, number, number, number][] = [
      [k, k + 1, k, 0],
      [last * kept + k + 1, last * kept + k, k, last - 1],
      [(k + 1) * kept, k * kept, 0, k],
      [k * kept + last, (k + 1) * kept + last, last - 1, k],
    ]
    for (const [a, b, ci, cj] of edges) {
      if (!(at(ci, cj) || at(ci + 1, cj) || at(ci, cj + 1) || at(ci + 1, cj + 1))) continue
      const topA = copy(a, 0), topB = copy(b, 0), footA = copy(a, skirtDropM), footB = copy(b, skirtDropM)
      // Both windings, so it shows from whichever side the crack is seen.
      indices.push(topA, footA, footB, topA, footB, topB, topA, footB, footA, topA, topB, footB)
    }
  }
  // Cut to the roads' outline, so the ground stops at their edge at its true height.
  const clipped = clipOutsideRoads(layers, indices, field, roadSurfaceModel.terrainTuckM)
  if (!clipped.indices.length) return undefined
  const [positions, uvs, normals, colors, beach, cover] = clipped.layers
  const mesh = meshes.surface('Highwood terrain', positions, clipped.indices, material, undefined, uvs, normals)
  mesh.setVerticesData(VertexBuffer.ColorKind, colors)
  mesh.setVerticesData(beachAttribute, beach, false, beachAttributeSize)
  mesh.setVerticesData(groundCoverAttribute, cover, false, beachAttributeSize)
  mesh.freezeWorldMatrix()
  return mesh
}
