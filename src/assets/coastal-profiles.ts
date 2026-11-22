import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'

// Cross-sections along local Z. Moving the middle of a section bends the silhouette.
type Section = readonly [z: number, centerY: number, halfWidth: number, halfHeight: number]

export function coastalProfile(meshes: MeshFactory, parent: TransformNode, name: string, color: string, sections: readonly Section[], sides = 12, roundness = 1) {
  const vertices: number[] = [], faces: number[] = []
  const contour = (n: number) => Math.sign(n) * Math.abs(n) ** roundness
  for (const [row, [z, center, width, height]] of sections.entries()) {
    for (let i = 0; i < sides; i++) {
      const theta = i * 2 * Math.PI / sides
      vertices.push(width * contour(Math.cos(theta)), center + height * contour(Math.sin(theta)), z)
      if (!row) continue
      const a = (row - 1) * sides + i, b = (row - 1) * sides + (i + 1) % sides
      faces.push(a, a + sides, b, b, a + sides, b + sides)
    }
  }
  const last = (sections.length - 1) * sides
  for (let i = 1; i < sides - 1; i++) faces.push(0, i, i + 1, last, last + i + 1, last + i)
  const mesh = meshes.surface(name, vertices, faces, color, parent)
  meshes.shadows.addShadowCaster(mesh, false)
  return mesh
}
