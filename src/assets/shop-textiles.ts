import { Color3 } from '@babylonjs/core/Maths/math.color'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { shopTopFit } from './geometry/shop-top-fit'
import type { Section } from './shop-tailoring'

const minimumSectionGap = 0.0001
const coordinatesPerVertex = 3
const verticesPerTriangle = 3
const channelsPerVertex = 4
const heightAxis = 1
const blueChannel = 2
const stripeRepeat = 2

export function checkRows(rows: Section[]) {
  const { rowCuts, stripeHeight } = shopTopFit.gingham
  const result: Section[] = []
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i], b = rows[i + 1]
    result.push(a)
    if (!b) break
    const [lowerY, lowerX, lowerZ, lowerWidth, lowerDepth, pigment] = a
    const [upperY, upperX, upperZ, upperWidth, upperDepth] = b
    for (let y = rowCuts.startY; y < rowCuts.stopY; y += stripeHeight) {
      if (y <= lowerY + minimumSectionGap || y >= upperY - minimumSectionGap) continue
      const t = (y - lowerY) / (upperY - lowerY)
      const lerp = (lower: number, upper: number) => lower + (upper - lower) * t
      result.push([y, lerp(lowerX, upperX), lerp(lowerZ, upperZ), lerp(lowerWidth, upperWidth), lerp(lowerDepth, upperDepth), pigment])
    }
  }
  return result
}

// Split only the printed fabric's triangle colors. The continuous contour keeps its
// smooth normals while intersecting warp and weft stripes get a crisp boundary.
export function printGingham(mesh: Mesh, trim: string, sides: number) {
  const { print, stripeHeight, inkPerStripe } = shopTopFit.gingham
  const originalIndices = Array.from(mesh.getIndices()!)
  mesh.convertToUnIndexedMesh()
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!
  const pigments = mesh.getVerticesData(VertexBuffer.ColorKind)!
  const thread = Color3.FromHexString(trim)
  const vertexCount = positions.length / coordinatesPerVertex
  const yAt = (vertex: number) => positions[vertex * coordinatesPerVertex + heightAxis]
  for (let vertex = 0; vertex < vertexCount; vertex += verticesPerTriangle) {
    const second = vertex + 1, third = second + 1
    const y = (yAt(vertex) + yAt(second) + yAt(third)) / verticesPerTriangle
    if (y < print.bottomY || y >= print.topY) continue
    // Both triangles between adjacent spokes share one thread color, including the wrap at the back.
    const a = originalIndices[vertex] % sides, b = originalIndices[second] % sides, c = originalIndices[third] % sides
    const first = Math.min(a, b, c), last = Math.max(a, b, c)
    const spoke = last - first === sides - 1 ? last : first
    const warp = spoke % stripeRepeat
    const weft = Math.floor((y - print.bottomY) / stripeHeight) % stripeRepeat
    const mix = (warp + weft) * inkPerStripe
    for (let corner = 0; corner < verticesPerTriangle; corner++) {
      const colorIndex = channelsPerVertex * (vertex + corner)
      pigments[colorIndex] += (thread.r - pigments[colorIndex]) * mix
      pigments[colorIndex + 1] += (thread.g - pigments[colorIndex + 1]) * mix
      pigments[colorIndex + blueChannel] += (thread.b - pigments[colorIndex + blueChannel]) * mix
    }
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, pigments)
}
