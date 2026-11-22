import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'

import { wayfindingSign } from './geometry/wayfinding-sign'

interface SignPose { x: number, y: number, z: number, heading: number }

export function createWayfindingSign(meshes: MeshFactory, name: string, { x, y, z, heading }: SignPose) {
  const root = new TransformNode(name, meshes.scene)
  root.position.set(x, y, z)
  root.rotation.y = heading
  const { post, board, face, label } = wayfindingSign
  const texture = new DynamicTexture(name, { width: label.width, height: label.height }, meshes.scene, true)
  const font = name.length > label.condensedAfter ? label.condensedFont : label.font
  texture.drawText(name, null, label.baseline, font, label.ink, label.background, true)
  const material = new StandardMaterial(name, meshes.scene)
  material.diffuseTexture = texture
  material.backFaceCulling = false
  for (const side of [-1, 1]) meshes.box(side * post.offsetX, post.y, 0, ...post.size, post.color, root)
  meshes.box(0, board.y, 0, ...board.size, board.color, root)
  meshes.surface(`${name} face`, [...face.positions], [...face.indices], material, root, [...face.uvs])
}
