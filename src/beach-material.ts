import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'
import type { Material } from '@babylonjs/core/Materials/material'
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer'
import { starterShoreFinish } from './assets/geometry/starter-landscape'
import { environmentalMaterialPriority } from './assets/recipes/island-shader-presets'
import type { MeshFactory } from './island-meshes'
import { tidePool, type coastalSurface } from './terrain'
import type { Point } from './world'

export const beachAttribute = 'beachCover'
export const beachAttributeSize = 4
const beachPriority = environmentalMaterialPriority + 1
const varyings = 'varying vec4 shoreCover;'
const { sand, rock, wetSandTint, shellglass } = starterShoreFinish

export function beachVertex({ x, z }: Point, surface: ReturnType<typeof coastalSurface>) {
  const bed = Math.max(0, 1 - Math.hypot((x - tidePool.x) / shellglass.toneRadiusX, (z - tidePool.z) / shellglass.toneRadiusZ) ** shellglass.falloffPower)
  const { seam } = shellglass
  const seams = seam.base + seam.amplitude * Math.sin(x * seam.xFrequency + z * seam.zFrequency)
  return [surface.sand, surface.rock, surface.wet, bed * seams]
}

class BeachMaterial extends MaterialPluginBase {
  private readonly grains
  private readonly stone
  constructor(material: Material, meshes: MeshFactory) {
    super(material, 'Starter beach surface', beachPriority)
    this.grains = meshes.paintRecipe('dry-beach').albedoTexture
    this.stone = meshes.paintRecipe('sandstone').albedoTexture
    this._enable(true)
  }

  override getClassName() { return 'BeachMaterial' }

  override getAttributes(attributes: string[]) { attributes.push(beachAttribute) }
  override getSamplers(samplers: string[]) { samplers.push('shoreGrains', 'shoreStone') }

  override bindForSubMesh(buffer: UniformBuffer) {
    buffer.setTexture('shoreGrains', this.grains)
    buffer.setTexture('shoreStone', this.stone)
  }

  override getCustomCode(type: string): Record<string, string> {
    if (type === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `attribute vec4 ${beachAttribute}; ${varyings}`,
        CUSTOM_VERTEX_MAIN_END: `shoreCover = ${beachAttribute};`,
      }
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `${varyings}
        uniform sampler2D shoreGrains;
        uniform sampler2D shoreStone;`,
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
        float coastAmount = shoreCover.x + shoreCover.y;
        if (coastAmount > 0.) {
          vec3 wetTint = 1. + shoreCover.z * vec3(-${wetSandTint.redLoss}, -${wetSandTint.greenLoss}, ${wetSandTint.blueGain});
          vec3 basinTint = 1. - shoreCover.w * vec3(${shellglass.redLoss}, ${shellglass.greenLoss}, ${shellglass.blueLoss});
          vec3 grains = toLinearSpace(texture2D(shoreGrains, vPositionW.xz * ${sand.repeatsPerMetre}).rgb);
          vec2 bedding = mat2(${rock.cos}, -${rock.sin}, ${rock.sin}, ${rock.cos}) * vPositionW.xz;
          vec3 stone = toLinearSpace(texture2D(shoreStone, bedding * ${rock.repeatsPerMetre}).rgb);
          stone *= vec3(${rock.red}, ${rock.green}, ${rock.blue});
          surfaceAlbedo = surfaceAlbedo * (1. - coastAmount)
            + grains * wetTint * basinTint * shoreCover.x
            + stone * wetTint * shoreCover.y;
          #ifdef NORMAL
            normalW = normalize(mix(normalW, normalize(vNormalW), coastAmount));
          #endif
        }`,
    }
  }
}

export function useBeachMaterial(material: Material, meshes: MeshFactory) {
  new BeachMaterial(material, meshes)
}
