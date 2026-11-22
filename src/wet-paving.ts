import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'
import type { Material } from '@babylonjs/core/Materials/material'
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer'
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine'
import type { Scene } from '@babylonjs/core/scene'
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh'
import { environmentalMaterialPriority } from './assets/recipes/island-shader-presets'
import { patchNoise } from './shader-studies'

class WetPaving extends MaterialPluginBase {
  wetness = 0
  reflection = 0

  constructor(material: Material) {
    super(material, 'Wet paving', environmentalMaterialPriority)
    this.registerForExtraEvents = true
    this._enable(true)
  }

  override getClassName() { return 'WetPaving' }

  override getUniforms() {
    return { fragment: 'uniform vec2 pavingControls; uniform vec3 pavingSky;', externalUniforms: ['pavingControls', 'pavingSky'] }
  }

  override hardBindForSubMesh(_buffer: UniformBuffer, scene: Scene, _engine: AbstractEngine, subMesh: SubMesh) {
    subMesh.effect?.setFloat2('pavingControls', this.wetness, this.reflection)
    subMesh.effect?.setColor3('pavingSky', scene.fogColor)
  }

  override getCustomCode(type: string) {
    if (type !== 'fragment') return null
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: patchNoise,
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
        float wetFilm = 0.;
        if (pavingControls.x > 0.) {
          vec2 pavingPoint = vPositionW.xz;
          float pores = .76 * studyNoise(pavingPoint * 1.7) + .24 * studyNoise(pavingPoint * 8.6);
          float spread = smoothstep(.47 - pavingControls.x * .33, .72 - pavingControls.x * .21, pores);
          wetFilm = spread * pavingControls.x;
          surfaceAlbedo *= 1. - pavingControls.x * .22 - wetFilm * .34;
        }`,
      CUSTOM_FRAGMENT_BEFORE_FOG: `
        if (wetFilm > .001 && pavingControls.y > 0.) {
          float grazing = 1. - clamp(dot(normalW, viewDirectionW), 0., 1.);
          vec3 reflectedRay = reflect(-viewDirectionW, normalW);
          float skyBand = .30 + .70 * exp(-abs(reflectedRay.y - .20) * 2.5);
          float fresnel = .08 + .92 * pow(grazing, 4.);
          vec3 skyReflection = mix(pavingSky * pavingSky, vec3(.43,.59,.72), .24);
          finalColor.rgb += skyReflection * wetFilm * fresnel * skyBand * pavingControls.y;
        }`,
    }
  }
}

export function createWetPaving(material: Material) {
  const shader = new WetPaving(material)
  return (wetness: number, reflection: number) => {
    shader.wetness = wetness
    shader.reflection = reflection
  }
}
