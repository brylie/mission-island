import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { Constants } from '@babylonjs/core/Engines/constants'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder'
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'
import { createIslandMaterial } from './materials'
import { groundHeight } from './terrain'
import type { Point } from './world'

export function createObjectiveMarker({ scene, paint }: MeshFactory, point: Point, size: number, color: string) {
  const root = new TransformNode('Objective area', scene)
  root.position.set(point.x, groundHeight(point) + 0.095, point.z)

  const ring = CreateTorus('Objective ring', { diameter: size, thickness: 0.115, tessellation: 60 }, scene)
  ring.material = paint(color, true)
  ring.isPickable = false
  ring.parent = root

  const height = 1.58
  const curtain = CreateCylinder('Objective halo', {
    diameterBottom: size, diameterTop: size * 1.013, height, cap: 0, tessellation: 64, subdivisions: 8,
  }, scene)
  const tint = Color3.FromHexString(color)
  const vertices = curtain.getVerticesData(VertexBuffer.PositionKind) ?? []
  const colors: number[] = []
  for (let i = 1; i < vertices.length; i += 3) {
    const fraction = 1 - (vertices[i] + height / 2) / height
    colors.push(tint.r, tint.g, tint.b, 0.34 * Math.max(0, fraction) ** 2.6)
  }
  curtain.setVerticesData(VertexBuffer.ColorKind, colors)
  curtain.hasVertexAlpha = true
  curtain.alphaIndex = 2
  curtain.position.y = height / 2
  curtain.isPickable = false
  curtain.parent = root
  const halo = createIslandMaterial(scene, 'Objective glow', '#ffffff')
  halo.disableLighting = true
  halo.backFaceCulling = false
  halo.alpha = 0.82
  halo.alphaMode = Constants.ALPHA_ADD
  curtain.material = halo
  return root
}
