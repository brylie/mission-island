import { Color3 } from '@babylonjs/core/Maths/math.color'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { garment } from './crew-shapes'

export type Section = [y: number, x: number, z: number, width: number, depth: number, pigment?: string]

// Dye changes share the fabric surface. Adjacent rings give a stripe a crisp woven edge.
export function tailored(meshes: MeshFactory, root: TransformNode, name: string, color: string, rows: Section[], sides = 24, opening = 0) {
  if (opening) {
    const [y, x, z, w, d, tint = color] = rows[rows.length - 1]
    const lining = Color3.FromHexString(tint).scale(.46).toHexString()
    rows = [...rows, [y + .001, x, z, w - .006, d - .006, tint],
    [y - .005, x, z, w - .009, d - .009, lining], [y - opening, x, z, w * .80, d * .80, lining]]
  }
  const mesh = garment(meshes, root, name, '#ffffff', rows.map(([y, x, z, w, d]) => [y, x, z, w, d]), .90, sides)
  const pigments: number[] = []
  for (const row of rows) {
    const tone = Color3.FromHexString(row[5] ?? color)
    for (let i = 0; i < sides; i++) pigments.push(tone.r, tone.g, tone.b, 1)
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, pigments)
  return mesh
}

// Sample the triangulated cloth along one axis. A badge can follow the actual instep,
// pocket or sleeve even when a neighbouring garment has a different cut.
export function panelSurface(mesh: Mesh, axis: 0 | 1 | 2, sign: number) {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!
  const indices = mesh.getIndices()!
  const a = (axis + 1) % 3, b = (axis + 2) % 3
  return (point: number[]) => {
    let outside = -Infinity
    for (let i = 0; i < indices.length; i += 3) {
      const p = 3 * indices[i], q = 3 * indices[i + 1], r = 3 * indices[i + 2]
      const qa = positions[q + a] - positions[p + a], qb = positions[q + b] - positions[p + b]
      const ra = positions[r + a] - positions[p + a], rb = positions[r + b] - positions[p + b]
      const det = qa * rb - ra * qb
      if (Math.abs(det) < 1e-9) continue
      const da = point[a] - positions[p + a], db = point[b] - positions[p + b]
      const u = (da * rb - db * ra) / det, v = (db * qa - da * qb) / det
      if (u < 0 || v < 0 || u + v > 1) continue
      const depth = positions[p + axis] + u * (positions[q + axis] - positions[p + axis]) + v * (positions[r + axis] - positions[p + axis])
      outside = Math.max(outside, sign * depth)
    }
    if (Number.isFinite(outside)) point[axis] = sign * (outside + .0035)
    return point
  }
}

// Subdivide the appliqué so its center and edges conform to the same curved panel.
export function applique(meshes: MeshFactory, root: TransformNode, name: string, color: string,
  outline: number[][], point: (u: number, v: number) => number[], outward: number[]) {
  const boundary = outline.flatMap(([u, v], i) => {
    const [x, y] = outline[(i + 1) % outline.length]
    return [0, .25, .5, .75].map(t => [u + t * (x - u), v + t * (y - v)])
  })
  const vertices = [...point(0, 0)], faces: number[] = []
  const n = boundary.length
  for (let ring = 1; ring <= 4; ring++) {
    for (let i = 0; i < n; i++) {
      const [u, v] = boundary[i]
      vertices.push(...point(ring * u / 4, ring * v / 4))
      const a = 1 + (ring - 1) * n + i, b = 1 + (ring - 1) * n + (i + 1) % n
      if (ring === 1) faces.push(0, a, b)
      else faces.push(a - n, a, b - n, b - n, a, b)
    }
  }
  const [cx, cy, cz, ax, ay, az, bx, by, bz] = vertices
  const nx = (ay - cy) * (bz - cz) - (az - cz) * (by - cy)
  const ny = (az - cz) * (bx - cx) - (ax - cx) * (bz - cz)
  const nz = (ax - cx) * (by - cy) - (ay - cy) * (bx - cx)
  if (nx * outward[0] + ny * outward[1] + nz * outward[2] > 0) faces.reverse()
  return meshes.surface(name, vertices, faces, color, root)
}
