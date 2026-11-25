import type { Material } from '@babylonjs/core/Materials/material'
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'
import { RegisterClass } from '@babylonjs/core/Misc/typeStore'
import { environmentalMaterialPriority } from './assets/recipes/island-shader-presets'

// Lights thin instances whose matrices shear, such as shrubs leaning to lie on a slope. Babylon's
// thin-instance vertex path divides each normal by its matrix's squared column lengths. That
// equals the inverse transpose only when the columns are at right angles, and it ignores the
// NONUNIFORMSCALING flag (checked against @babylonjs/core 9.37.1, pbr.vertex and default.vertex).
// This plugin recomputes the world normal with the instance's own inverse transpose, after
// Babylon's and before the fragment shader reads it. Nothing in the vertex stage reads the
// normal between the two while the scene has no environment texture.

const priority = environmentalMaterialPriority + 1

class ShearedNormals extends MaterialPluginBase {
  constructor(material: Material) {
    super(material, 'Sheared thin-instance normals', priority)
    this._enable(true)
  }

  override getClassName() { return 'ShearedNormals' }

  override getCustomCode(type: string): Record<string, string> | null {
    if (type !== 'vertex') return null
    return {
      CUSTOM_VERTEX_UPDATE_WORLDPOS: `
        #if defined(NORMAL) && defined(INSTANCES) && defined(THIN_INSTANCES)
          vNormalW = normalize(transposeMat3(inverseMat3(mat3(finalWorld))) * normalUpdated);
        #endif`,
    }
  }
}

// Registered, so a clone of the material keeps its plugin.
RegisterClass('BABYLON.ShearedNormals', ShearedNormals)

// A copy of `material` that lights sheared thin instances correctly. The recipe's own material
// stays as it is for everything else that draws with it.
export function shearedNormalsMaterial(material: Material) {
  const copy = material.clone(`${material.name} sheared`) ?? material
  new ShearedNormals(copy)
  return copy
}
