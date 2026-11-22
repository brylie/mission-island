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
import { objectiveMarkerLook } from './assets/geometry/starter-cues'

const positionComponents = 3
const halfHeightDivisor = 2

export const objectiveLayer = 0x08000000

export function createObjectiveMarker({ scene, paint }: MeshFactory, point: Point, size: number, color: string) {
  const root = new TransformNode('Objective area', scene)
  root.position.set(point.x, groundHeight(point) + objectiveMarkerLook.groundOffset, point.z)

  const ring = CreateTorus('Objective ring', { diameter: size, thickness: objectiveMarkerLook.ring.thickness, tessellation: objectiveMarkerLook.ring.segments }, scene)
  ring.material = paint(color, true)
  ring.isPickable = false
  ring.parent = root

  const height = 1.58
  const curtain = CreateCylinder('Objective halo', {
    diameterBottom: size,
    diameterTop: size * objectiveMarkerLook.curtain.topScale,
    height,
    cap: 0,
    tessellation: objectiveMarkerLook.curtain.segments,
    subdivisions: objectiveMarkerLook.curtain.rows,
  }, scene)
  const tint = Color3.FromHexString(color)
  const vertices = curtain.getVerticesData(VertexBuffer.PositionKind) ?? []
  const colors: number[] = []
  for (let i = 1; i < vertices.length; i += positionComponents) {
    const fraction = 1 - (vertices[i] + height / halfHeightDivisor) / height
    colors.push(tint.r, tint.g, tint.b, objectiveMarkerLook.curtain.opacity * Math.max(0, fraction) ** objectiveMarkerLook.curtain.fadePower)
  }
  curtain.setVerticesData(VertexBuffer.ColorKind, colors)
  curtain.hasVertexAlpha = true
  curtain.alphaIndex = objectiveMarkerLook.curtain.alphaIndex
  curtain.position.y = height / halfHeightDivisor
  curtain.isPickable = false
  curtain.parent = root
  ring.layerMask = curtain.layerMask = objectiveLayer
  const halo = createIslandMaterial(scene, 'Objective glow', '#ffffff')
  halo.disableLighting = true
  halo.emissiveColor = Color3.White()
  halo.backFaceCulling = false
  halo.alpha = objectiveMarkerLook.haloOpacity
  halo.alphaMode = Constants.ALPHA_ADD
  curtain.material = halo
  return root
}
