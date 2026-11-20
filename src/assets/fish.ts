import type { Material } from '@babylonjs/core/Materials/material'
import type { MeshFactory } from '../island-meshes'

export function createSchoolFish(meshes: MeshFactory, paint: Material) {
  return meshes.surface('Schooling fish',
    [0, 0, .39, .095, 0, .035, 0, .12, .02, -.095, 0, .035, 0, -.085, .02,
      0, 0, -.29, 0, .105, -.44, 0, -.096, -.44],
    [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4, 5, 6, 7], paint)
}
