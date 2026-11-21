import { Color3 } from '@babylonjs/core/Maths/math.color'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Section } from './shop-tailoring'

export function checkRows(rows: Section[]) {
  const result: Section[] = []
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i], b = rows[i + 1]
    result.push(a)
    if (!b) break
    for (let y = .828; y < 1.26; y += .044) {
      if (y <= a[0] + .0001 || y >= b[0] - .0001) continue
      const t = (y - a[0]) / (b[0] - a[0])
      const lerp = (n: 1 | 2 | 3 | 4) => a[n] + (b[n] - a[n]) * t
      result.push([y, lerp(1), lerp(2), lerp(3), lerp(4), a[5]])
    }
  }
  return result
}

// Split only the printed fabric's triangle colors. The continuous contour keeps its
// smooth normals while intersecting warp and weft stripes get a crisp boundary.
export function printGingham(mesh: Mesh, trim: string) {
  const originalIndices = Array.from(mesh.getIndices()!)
  mesh.convertToUnIndexedMesh()
  const pos = mesh.getVerticesData('position')!, pigments = mesh.getVerticesData('color')!
  const thread = Color3.FromHexString(trim)
  for (let i = 0; i < pos.length; i += 9) {
    const y = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3
    if (y < .828 || y >= 1.252) continue
    const face = i / 3
    // Each panel spans two adjacent spokes of the 32-sided torso. Both
    // triangles must share one thread color, including the wrap at the back.
    const a = originalIndices[face] % 32, b = originalIndices[face + 1] % 32, c = originalIndices[face + 2] % 32
    const first = Math.min(a, b, c), last = Math.max(a, b, c)
    const spoke = last - first === 31 ? last : first
    const warp = spoke % 2, weft = Math.floor((y - .828) / .044) % 2
    const mix = (warp + weft) * .35
    for (let j = 0; j < 3; j++) {
      const k = 4 * (i / 3 + j)
      pigments[k] += (thread.r - pigments[k]) * mix
      pigments[k + 1] += (thread.g - pigments[k + 1]) * mix
      pigments[k + 2] += (thread.b - pigments[k + 2]) * mix
    }
  }
  mesh.setVerticesData('color', pigments)
}
