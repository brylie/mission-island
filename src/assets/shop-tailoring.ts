import { Color3 } from '@babylonjs/core/Maths/math.color'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { tailoringGeometry } from './geometry/shop-tailoring'
import { garment } from './crew-shapes'

const coordinatesPerVertex = 3
const verticesPerTriangle = 3
const lastTriangleVertex = 2
const projectedAreaTolerance = 1e-9

export type Section = [y: number, x: number, z: number, width: number, depth: number, pigment?: string]

// Dye changes share the fabric surface. Adjacent rings give a stripe a crisp woven edge.
export function tailored(meshes: MeshFactory, root: TransformNode, name: string, color: string, rows: Section[], sides: number = tailoringGeometry.sides, opening = 0) {
  let profile = rows
  if (opening) {
    const { liningShade, edge, innerEdge, interiorScale } = tailoringGeometry.opening
    const [y, x, z, w, d, tint = color] = rows[rows.length - 1]
    const lining = Color3.FromHexString(tint).scale(liningShade).toHexString()
    profile = [...rows, [y + edge.rise, x, z, w - edge.inset, d - edge.inset, tint], [y - innerEdge.drop, x, z, w - innerEdge.inset, d - innerEdge.inset, lining], [y - opening, x, z, w * interiorScale, d * interiorScale, lining]]
  }
  const mesh = garment(meshes, root, name, '#ffffff', profile.map(([y, x, z, w, d]) => [y, x, z, w, d]), tailoringGeometry.softness, sides)
  const pigments: number[] = []
  for (const row of profile) {
    const tone = Color3.FromHexString(row[5] ?? color)
    for (let i = 0; i < sides; i++) pigments.push(tone.r, tone.g, tone.b, 1)
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, pigments)
  return mesh
}

// Sample the triangulated cloth along one axis. A badge can follow the actual instep,
// pocket or sleeve even when a neighbouring garment has a different cut.
type CoordinateAxis = 0 | 1 | 2

export function panelSurface(mesh: Mesh, axis: CoordinateAxis, sign: number) {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!
  const indices = mesh.getIndices()!
  const a = (axis + 1) % coordinatesPerVertex, b = (a + 1) % coordinatesPerVertex
  return (point: number[]) => {
    let outside = -Infinity
    for (let i = 0; i < indices.length; i += verticesPerTriangle) {
      const p = coordinatesPerVertex * indices[i], q = coordinatesPerVertex * indices[i + 1], r = coordinatesPerVertex * indices[i + lastTriangleVertex]
      const qa = positions[q + a] - positions[p + a], qb = positions[q + b] - positions[p + b]
      const ra = positions[r + a] - positions[p + a], rb = positions[r + b] - positions[p + b]
      const det = qa * rb - ra * qb
      if (Math.abs(det) < projectedAreaTolerance) continue
      const da = point[a] - positions[p + a], db = point[b] - positions[p + b]
      const u = (da * rb - db * ra) / det, v = (db * qa - da * qb) / det
      if (u < 0 || v < 0 || u + v > 1) continue
      const depth = positions[p + axis] + u * (positions[q + axis] - positions[p + axis]) + v * (positions[r + axis] - positions[p + axis])
      outside = Math.max(outside, sign * depth)
    }
    if (Number.isFinite(outside)) point[axis] = sign * (outside + tailoringGeometry.applique.lift)
    return point
  }
}

// Subdivide the appliqué so its center and edges conform to the same curved panel.
export function applique(meshes: MeshFactory, root: TransformNode, name: string, color: string, outline: number[][], point: (u: number, v: number) => number[], outward: number[]) {
  const { edgeFractions, rings } = tailoringGeometry.applique
  const boundary = outline.flatMap(([u, v], i) => {
    const [x, y] = outline[(i + 1) % outline.length]
    return edgeFractions.map((t) => [u + t * (x - u), v + t * (y - v)])
  })
  const vertices = [...point(0, 0)], faces: number[] = []
  const n = boundary.length
  for (let ring = 1; ring <= rings; ring++) {
    for (let i = 0; i < n; i++) {
      const [u, v] = boundary[i]
      vertices.push(...point(ring * u / rings, ring * v / rings))
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
