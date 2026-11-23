import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'
import type { Material } from '@babylonjs/core/Materials/material'
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer'
import { Scene } from '@babylonjs/core/scene'
import { environmentalMaterialPriority } from './assets/recipes/island-shader-presets'

// One fog for every lit material. Babylon mixes fog before image processing,
// so tone mapping and contrast change the haze: PBR ground washed pale and
// standard trees and walls hazed toward a different colour than the sky. This
// plugin takes over Babylon's fog wherever a material asks for it, and mixes
// toward the scene's fog colour after image processing, by distance from the
// eye, the way the ocean shader does. Land, trees, buildings and sea at the
// same distance then fade alike.

const fogPriority = environmentalMaterialPriority - 1
const vec3Size = 3
const fogUniforms = 'uniform vec3 sceneFog; uniform vec3 sceneFogColor;'

class SceneFog extends MaterialPluginBase {
  private readonly output: string

  constructor(material: Material) {
    super(material, 'Scene fog', fogPriority, { SCENE_FOG: false })
    this.output = material instanceof PBRMaterial ? 'finalColor' : 'color'
    this._enable(true)
  }

  override getClassName() { return 'SceneFog' }

  // Babylon sets FOG from the material's own `fogEnabled` before plugins run;
  // the plugin keeps that choice and turns off Babylon's own mix.
  override prepareDefines(defines: Record<string, unknown> & { _areMiscDirty?: boolean }) {
    if (defines.FOG) {
      defines.SCENE_FOG = true
      defines.FOG = false
    }
    else if (defines._areMiscDirty) defines.SCENE_FOG = false
  }

  override getUniforms() {
    return { ubo: [{ name: 'sceneFog', size: vec3Size, type: 'vec3' }, { name: 'sceneFogColor', size: vec3Size, type: 'vec3' }], fragment: fogUniforms }
  }

  override bindForSubMesh(buffer: UniformBuffer) {
    const scene = this._material.getScene()
    const linear = scene.fogEnabled && scene.fogMode === Scene.FOGMODE_LINEAR
    buffer.updateFloat3('sceneFog', scene.fogStart, scene.fogEnd, Number(linear))
    buffer.updateColor3('sceneFogColor', scene.fogColor)
  }

  override getCustomCode(type: string): Record<string, string> | null {
    if (type !== 'fragment') return null
    const color = this.output
    return {
      CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
        #ifdef SCENE_FOG
        if (sceneFog.z > 0.) {
          float haze = smoothstep(sceneFog.x, sceneFog.y, distance(vPositionW, vEyePosition.xyz));
          #ifdef PREMULTIPLYALPHA
          ${color}.rgb = mix(${color}.rgb, sceneFogColor * ${color}.a, haze);
          #else
          ${color}.rgb = mix(${color}.rgb, sceneFogColor, haze);
          #endif
        }
        #endif`,
    }
  }
}

// Gives every standard and PBR material made in the scene the shared fog, from now on.
export function useSceneFog(scene: Scene) {
  const attach = (material: Material) => {
    if (material instanceof StandardMaterial || material instanceof PBRMaterial) new SceneFog(material)
  }
  scene.materials.forEach(attach)
  scene.onNewMaterialAddedObservable.add(attach)
  return scene
}
