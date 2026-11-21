import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'

interface SignPose { x: number, y: number, z: number, heading: number }

export function createWayfindingSign(meshes: MeshFactory, name: string, { x, y, z, heading }: SignPose) {
  const root = new TransformNode(name, meshes.scene)
  root.position.set(x, y, z)
  root.rotation.y = heading
  const texture = new DynamicTexture(name, { width: 512, height: 128 }, meshes.scene, true)
  texture.drawText(name, null, 86, name.length > 15 ? 'bold 43px Georgia' : 'bold 54px Georgia', '#fff1cc', '#3b6b65', true)
  const material = new StandardMaterial(name, meshes.scene)
  material.diffuseTexture = texture
  material.backFaceCulling = false
  for (const side of [-1, 1]) meshes.box(side * 1.45, 1.24, 0, 0.18, 2.54, 0.17, '#987958', root)
  meshes.box(0, 2.03, 0, 3.91, 1.03, 0.19, '#edcf99', root)
  meshes.surface(`${name} face`, [-1.87, 1.58, 0.104, 1.87, 1.58, 0.104, 1.87, 2.48, 0.104, -1.87, 2.48, 0.104], [0, 2, 1, 0, 3, 2], material, root, [1, 0, 0, 0, 0, 1, 1, 1])
}
