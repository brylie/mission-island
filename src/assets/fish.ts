import type { Material } from '@babylonjs/core/Materials/material'
import type { MeshFactory } from '../island-meshes'
import { schoolingFishGeometry } from './geometry/fish'

export function createSchoolFish(meshes: MeshFactory, paint: Material) {
  const { vertices, faces } = schoolingFishGeometry
  return meshes.surface('Schooling fish', vertices.flat(), [...faces], paint)
}
