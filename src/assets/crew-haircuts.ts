import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { headSection } from './crew-scalp'
import { fittedHairGeometry, lowBunGeometry } from './geometry/crew-haircuts'

const half = 0.5
const piPerTurn = 2
const signedRange = 2
const coordinatesPerVertex = 3
const goldenAngleTerm = 3
const goldenAngleRadicand = 5
const goldenAngleRatio = goldenAngleTerm - Math.sqrt(goldenAngleRadicand)
const { coils, gathered, fringe } = fittedHairGeometry

// Stagger the coil centers over a sphere so the texture continues through the crown.
const coilCenters = Array.from({ length: coils.coilCount }, (_, i) => {
  const y = 1 - signedRange * (i + half) / coils.coilCount
  const radius = Math.sqrt(1 - y * y), angle = i * Math.PI * goldenAngleRatio
  return [radius * Math.cos(angle), y, radius * Math.sin(angle)]
})

function coilDepth(x: number, y: number, z: number) {
  let closest = 0
  for (const [cx, cy, cz] of coilCenters) closest = Math.max(closest, x * cx + y * cy + z * cz)
  return Math.exp(-coils.reliefFalloff * (1 - closest))
}

export function fittedHaircut(meshes: MeshFactory, head: TransformNode, style: 'coils' | 'bun', color: string) {
  const coiled = style === 'coils'
  const { sides, rows, lift: reliefLift, baseTone, reliefTone, crownHeight } = coiled ? coils : gathered
  const { part, waves } = gathered
  const { baseHeight, headRise, firstRowInset, scalpPadding, crownPadding, contourPower, crownZ } = fittedHairGeometry
  const vertices: number[] = [], faces: number[] = [], tones: number[] = []
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < sides; i++) {
      const a = i * piPerTurn * Math.PI / sides, u = Math.cos(a), v = Math.sin(a)
      const fringeLatitude = fringe.base + fringe.frontRise * v + fringe.templeLift * Math.abs(u) ** fringe.templePower
      const partLatitude = part.amplitude * Math.sin(part.frequency * a + part.phase) - part.frontDip * Math.max(0, v) ** part.frontPower
      const edge = fringeLatitude + (coiled ? coils.edgeFluting.amplitude * Math.cos(coils.edgeFluting.frequency * a) : partLatitude)
      const latitude = edge + (Math.PI * half - edge) * row / rows
      const y = Math.sin(latitude), x = u * Math.cos(latitude), z = v * Math.cos(latitude)
      const relief = coiled
        ? coilDepth(x, y, z)
        : half + half * Math.cos(waves.frequency * Math.atan2(y, x) + waves.zPhase * z + waves.bend * Math.sin(waves.bendFrequency * z))
      const lift = reliefLift * relief
      const height = baseHeight + headRise * y
      const section = headSection(height)
      const padding = row ? scalpPadding + lift : firstRowInset
      const rise = row ? Math.max(0, y) * (crownPadding + lift) : 0
      vertices.push(
        (section.width + padding) * Math.sign(u) * Math.abs(u) ** contourPower,
        height + rise,
        section.center + (section.depth + padding) * Math.sign(v) * Math.abs(v) ** contourPower,
      )
      const tint = baseTone + reliefTone * relief
      tones.push(tint, tint, tint, 1)
      const next = row * sides + (i + 1) % sides, index = row * sides + i
      if (row) faces.push(index - sides, next - sides, index, next - sides, next, index)
    }
  }
  const crown = vertices.length / coordinatesPerVertex
  vertices.push(0, crownHeight, crownZ)
  tones.push(1, 1, 1, 1)
  for (let i = 0; i < sides; i++) faces.push(crown - sides + i, crown - sides + (i + 1) % sides, crown)
  const mesh = meshes.surface(coiled ? 'Close coils' : 'Gathered hair', vertices, faces, color, head)
  mesh.setVerticesData(VertexBuffer.ColorKind, tones)
  meshes.shadows.addShadowCaster(mesh, false)
  return mesh
}

export function lowBun(meshes: MeshFactory, head: TransformNode, color: string) {
  const { sections, sides, folds } = lowBunGeometry
  const points: number[] = [], faces: number[] = [], tones: number[] = []
  for (const [row, [z, y, width, height]] of sections.entries()) {
    for (let i = 0; i < sides; i++) {
      const angle = piPerTurn * Math.PI * i / sides
      const fold = half + half * Math.cos(folds.count * angle + folds.twist * row / sections.length)
      const radius = folds.radiusBase + folds.radiusVariation * fold
      points.push(width * Math.cos(angle) * radius, y + height * Math.sin(angle) * radius, z)
      const tone = folds.baseTone + folds.toneVariation * fold
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
