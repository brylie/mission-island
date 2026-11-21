import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { headSection } from './crew-scalp'

// Stagger the coil centers over a sphere so the texture continues through the crown.
const coilCenters = Array.from({ length: 76 }, (_, i) => {
  const y = 1 - 2 * (i + .5) / 76
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
      const fringe = .12 + .38 * v + .08 * Math.abs(u) ** 8
      const part = .08 * Math.sin(2 * a + .8) - .075 * Math.max(0, v) ** 12
      const edge = fringe + (coiled ? .023 * Math.cos(16 * a) : part)
      const latitude = edge + (Math.PI / 2 - edge) * row / rows
      const y = Math.sin(latitude), x = u * Math.cos(latitude), z = v * Math.cos(latitude)
      const relief = coiled ? coilDepth(x, y, z) : .5 + .5 * Math.cos(11 * Math.atan2(y, x) + 3 * z + .35 * Math.sin(4 * z))
      const lift = (coiled ? .018 : .009) * relief
      const height = .294 + .266 * y
      const section = headSection(height)
      const padding = row ? .009 + lift : -.004
      const rise = row ? Math.max(0, y) * (.014 + lift) : 0
      vertices.push((section.width + padding) * Math.sign(u) * Math.abs(u) ** .91,
        height + rise, section.center + (section.depth + padding) * Math.sign(v) * Math.abs(v) ** .91)
      const tint = (coiled ? .91 : .89) + (coiled ? .12 : .13) * relief
      tones.push(tint, tint, tint, 1)
      const next = row * sides + (i + 1) % sides, index = row * sides + i
      if (row) faces.push(index - sides, next - sides, index, next - sides, next, index)
    }
  }
  const crown = vertices.length / 3
  vertices.push(0, coiled ? .584 : .578, -.011)
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
    [-.390, .227, .018, .025], [-.378, .233, .070, .061], [-.353, .240, .111, .087],
    [-.316, .244, .132, .104], [-.284, .245, .126, .100], [-.255, .249, .096, .079],
    [-.237, .252, .066, .056], [-.195, .255, .061, .052],
  ]
  const sides = 32, points: number[] = [], faces: number[] = [], tones: number[] = []
  for (const [row, [z, y, width, height]] of sections.entries()) {
    for (let i = 0; i < sides; i++) {
      const angle = 2 * Math.PI * i / sides
      const fold = .5 + .5 * Math.cos(4 * angle + 6 * row / sections.length)
      const radius = .94 + .09 * fold
      points.push(width * Math.cos(angle) * radius, y + height * Math.sin(angle) * radius, z)
      const tone = .86 + .17 * fold
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
