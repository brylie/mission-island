import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from './terrain'

export function buildSigns(meshes: MeshFactory) {
  const signs = [
    { x: -265, z: -228, name: 'BRINEWICK FERRY', angle: Math.PI },
    { x: -283, z: -113, name: 'BRINEWICK', angle: Math.PI },
    { x: 189.7, z: 28.9, name: 'LONG ACRE APIARY', angle: Math.PI / 2 },
    { x: 129, z: -58, name: 'BARLEYCROSS', angle: -Math.PI / 2 },
    { x: -10, z: 161, name: 'ALDERWATCH', angle: Math.PI / 2 },
  ]
  for (const { x, z, name, angle } of signs) {
    const root = new TransformNode(name, meshes.scene)
    root.position.set(x, groundHeight(x, z), z)
    root.rotation.y = angle
    const texture = new DynamicTexture(name, { width: 512, height: 128 }, meshes.scene, true)
    texture.drawText(name, null, 86, name.length > 15 ? 'bold 43px Georgia' : 'bold 54px Georgia', '#fff1cc', '#3b6b65', true)
    const material = new StandardMaterial(name, meshes.scene)
    material.diffuseTexture = texture
    material.backFaceCulling = false
    for (const side of [-1, 1]) meshes.box(side * 1.45, 1.24, 0, .18, 2.54, .17, '#987958', root)
    meshes.box(0, 2.03, 0, 3.91, 1.03, .19, '#edcf99', root)
    meshes.surface(`${name} face`, [-1.87, 1.58, .104, 1.87, 1.58, .104, 1.87, 2.48, .104, -1.87, 2.48, .104],
      [0, 2, 1, 0, 3, 2], material, root, [1, 0, 0, 0, 0, 1, 1, 1])
  }
}
