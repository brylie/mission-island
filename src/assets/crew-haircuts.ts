import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { headSection } from './crew-scalp'

// Stagger the coil centers over a sphere so the texture continues through the crown.
const coilCenters = Array.from({ length: 76 }, (_, i) => {
  const y = 1 - 2 * (i + 0.5) / 76
  const radius = Math.sqrt(1 - y * y), angle = i * Math.PI * (3 - Math.sqrt(5))
  return [radius * Math.cos(angle), y, radius * Math.sin(angle)]
})

function coilDepth(x: number, y: number, z: number) {
  let closest = 0
  for (const [cx, cy, cz] of coilCenters) closest = Math.max(closest, x * cx + y * cy + z * cz)
  return Math.exp(-65 * (1 - closest))
}

export function fittedHaircut(meshes: MeshFactory, head: TransformNode, style: 'coils' | 'bun', color: string) {
  const coiled = style === 'coils'
  const sides = coiled ? 64 : 48, rows = coiled ? 22 : 16
  const vertices: number[] = [], faces: number[] = [], tones: number[] = []
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < sides; i++) {
      const a = i * 2 * Math.PI / sides, u = Math.cos(a), v = Math.sin(a)
      const fringe = 0.12 + 0.38 * v + 0.08 * Math.abs(u) ** 8
      const part = 0.08 * Math.sin(2 * a + 0.8) - 0.075 * Math.max(0, v) ** 12
      const edge = fringe + (coiled ? 0.023 * Math.cos(16 * a) : part)
      const latitude = edge + (Math.PI / 2 - edge) * row / rows
      const y = Math.sin(latitude), x = u * Math.cos(latitude), z = v * Math.cos(latitude)
      const relief = coiled ? coilDepth(x, y, z) : 0.5 + 0.5 * Math.cos(11 * Math.atan2(y, x) + 3 * z + 0.35 * Math.sin(4 * z))
      const lift = (coiled ? 0.018 : 0.009) * relief
      const height = 0.294 + 0.266 * y
      const section = headSection(height)
      const padding = row ? 0.009 + lift : -0.004
      const rise = row ? Math.max(0, y) * (0.014 + lift) : 0
      vertices.push((section.width + padding) * Math.sign(u) * Math.abs(u) ** 0.91, height + rise, section.center + (section.depth + padding) * Math.sign(v) * Math.abs(v) ** 0.91)
      const tint = (coiled ? 0.91 : 0.89) + (coiled ? 0.12 : 0.13) * relief
      tones.push(tint, tint, tint, 1)
      const next = row * sides + (i + 1) % sides, index = row * sides + i
      if (row) faces.push(index - sides, next - sides, index, next - sides, next, index)
    }
  }
  const crown = vertices.length / 3
  vertices.push(0, coiled ? 0.584 : 0.578, -0.011)
  tones.push(1, 1, 1, 1)
  for (let i = 0; i < sides; i++) faces.push(crown - sides + i, crown - sides + (i + 1) % sides, crown)
  const mesh = meshes.surface(coiled ? 'Close coils' : 'Gathered hair', vertices, faces, color, head)
  mesh.setVerticesData(VertexBuffer.ColorKind, tones)
  meshes.shadows.addShadowCaster(mesh, false)
  return mesh
}

export function lowBun(meshes: MeshFactory, head: TransformNode, color: string) {
  // The knot sits below the cap band and narrows where it tucks into the nape.
  const sections = [
    [-0.390, 0.227, 0.018, 0.025],
    [-0.378, 0.233, 0.070, 0.061],
    [-0.353, 0.240, 0.111, 0.087],
    [-0.316, 0.244, 0.132, 0.104],
    [-0.284, 0.245, 0.126, 0.100],
    [-0.255, 0.249, 0.096, 0.079],
    [-0.237, 0.252, 0.066, 0.056],
    [-0.195, 0.255, 0.061, 0.052],
  ]
  const sides = 32, points: number[] = [], faces: number[] = [], tones: number[] = []
  for (const [row, [z, y, width, height]] of sections.entries()) {
    for (let i = 0; i < sides; i++) {
      const angle = 2 * Math.PI * i / sides
      const fold = 0.5 + 0.5 * Math.cos(4 * angle + 6 * row / sections.length)
      const radius = 0.94 + 0.09 * fold
      points.push(width * Math.cos(angle) * radius, y + height * Math.sin(angle) * radius, z)
      const tone = 0.86 + 0.17 * fold
      tones.push(tone, tone, tone, 1)
      if (!row) continue
      const a = (row - 1) * sides + i, b = (row - 1) * sides + (i + 1) % sides
      faces.push(a, a + sides, b, b, a + sides, b + sides)
    }
  }
  for (let i = 1; i < sides - 1; i++) faces.push(0, i, i + 1)
  const mesh = meshes.surface('Low bun', points, faces, color, head)
  mesh.setVerticesData(VertexBuffer.ColorKind, tones)
  meshes.shadows.addShadowCaster(mesh, false)
  return mesh
}
