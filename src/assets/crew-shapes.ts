import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'

type Contour = [height: number, x: number, z: number, width: number, depth: number]
type Sweep = [x: number, y: number, z: number, width: number, thickness: number]

function closedRings(meshes: MeshFactory, parent: TransformNode, name: string, color: string, vertices: number[], sides: number, vertical: boolean) {
  const indices: number[] = [], last = vertices.length / 3 - sides
  for (let row = 0; row < last; row += sides) {
    for (let i = 0; i < sides; i++) {
      const a = row + i, b = row + (i + 1) % sides
      indices.push(a, a + sides, b, b, a + sides, b + sides)
    }
  }
  for (let i = 1; i < sides - 1; i++) indices.push(0, i, i + 1, last, last + i + 1, last + i)
  if (vertical) indices.reverse()
  const mesh = meshes.surface(name, vertices, indices, color, parent)
  meshes.shadows.addShadowCaster(mesh, false)
  return mesh
}

export function garment(meshes: MeshFactory, parent: TransformNode, name: string, color: string, contour: Contour[], softness = 0.85, sides = 20) {
  const vertices: number[] = []
  for (const [y, x, z, w, d] of contour) {
    for (let i = 0; i < sides; i++) {
      const a = i * 2 * Math.PI / sides, u = Math.cos(a), v = Math.sin(a)
      vertices.push(x + w * Math.sign(u) * Math.abs(u) ** softness, y, z + d * Math.sign(v) * Math.abs(v) ** softness)
    }
  }
  return closedRings(meshes, parent, name, color, vertices, sides, true)
}

// Smooth tapered ribbons with thickness for eyelids, a smile or a lock of hair.
export function sweptDetail(meshes: MeshFactory, parent: TransformNode, name: string, color: string, path: Sweep[], normal: [number, number, number], sides = 10) {
  const points = path.map(([x, y, z]) => new Vector3(x, y, z))
  const outside = Vector3.FromArray(normal).normalize()
  const vertices: number[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(i + 2, path.length - 1)]
    for (let j = 0; j <= (i === path.length - 2 ? 4 : 3); j++) {
      const t = j / 4, p = Vector3.CatmullRom(a, b, c, d, t)
      const tangent = Vector3.CatmullRom(a, b, c, d, t + 0.001).subtract(p).normalize()
      const across = Vector3.Cross(outside, tangent).normalize()
      const thick = Vector3.Cross(tangent, across)
      const width = path[i][3] * (1 - t) + path[i + 1][3] * t
      const depth = path[i][4] * (1 - t) + path[i + 1][4] * t
      for (let k = 0; k < sides; k++) {
        const theta = k * 2 * Math.PI / sides
        vertices.push(...p.add(across.scale(width * Math.cos(theta))).add(thick.scale(depth * Math.sin(theta))).asArray())
      }
    }
  }
  return closedRings(meshes, parent, name, color, vertices, sides, false)
}
