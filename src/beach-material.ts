import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'
import type { Material } from '@babylonjs/core/Materials/material'
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer'
import { highwoodGroundCover, starterShoreFinish } from './assets/geometry/starter-landscape'
import { environmentalMaterialPriority } from './assets/recipes/island-shader-presets'
import type { MeshFactory } from './island-meshes'
import { tidePool, type coastalSurface } from './terrain'
import type { Point } from './world'

export const beachAttribute = 'beachCover'
export const beachAttributeSize = 4
// Highwood's ground cover: litter, heath, moss and (1 - bracken). The last is stored
// inverted because a mesh without the attribute reads (0, 0, 0, 1): no cover at all.
export const groundCoverAttribute = 'groundCover'
const beachPriority = environmentalMaterialPriority + 1
const varyings = 'varying vec4 shoreCover; varying vec4 groundLayers;'
const { sand, rock, granite, triplanar, wetSandTint, shellglass } = starterShoreFinish
const { litter, heath, moss, bracken } = highwoodGroundCover

export function beachVertex({ x, z }: Point, surface: ReturnType<typeof coastalSurface>) {
  const bed = Math.max(0, 1 - Math.hypot((x - tidePool.x) / shellglass.toneRadiusX, (z - tidePool.z) / shellglass.toneRadiusZ) ** shellglass.falloffPower)
  const { seam } = shellglass
  const seams = seam.base + seam.amplitude * Math.sin(x * seam.xFrequency + z * seam.zFrequency)
  return [surface.sand, surface.rock, surface.wet, bed * seams]
}

class BeachMaterial extends MaterialPluginBase {
  private readonly grains
  private readonly stone
  private readonly granite
  private readonly duff
  constructor(material: Material, meshes: MeshFactory) {
    super(material, 'Starter beach surface', beachPriority)
    this.grains = meshes.paintRecipe('dry-beach').albedoTexture
    this.stone = meshes.paintRecipe('sandstone').albedoTexture
    this.granite = meshes.paintRecipe('granite').albedoTexture
    this.duff = meshes.paintRecipe('pine-duff').albedoTexture
    this._enable(true)
  }

  override getClassName() { return 'BeachMaterial' }

  override getAttributes(attributes: string[]) { attributes.push(beachAttribute, groundCoverAttribute) }
  override getSamplers(samplers: string[]) { samplers.push('shoreGrains', 'shoreStone', 'shoreGranite', 'groundDuff') }

  override bindForSubMesh(buffer: UniformBuffer) {
    buffer.setTexture('shoreGrains', this.grains)
    buffer.setTexture('shoreStone', this.stone)
    buffer.setTexture('shoreGranite', this.granite)
    buffer.setTexture('groundDuff', this.duff)
  }

  override getCustomCode(type: string): Record<string, string> {
    if (type === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `attribute vec4 ${beachAttribute}; attribute vec4 ${groundCoverAttribute}; ${varyings}`,
        CUSTOM_VERTEX_MAIN_END: `shoreCover = ${beachAttribute}; groundLayers = vec4(${groundCoverAttribute}.xyz, 1. - ${groundCoverAttribute}.w);`,
      }
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `${varyings}
        uniform sampler2D shoreGrains;
        uniform sampler2D shoreStone;
        uniform sampler2D shoreGranite;
        uniform sampler2D groundDuff;
        // Samples a texture from above and from both sides, weighted by the surface's facing.
        vec3 shoreTriplanar(sampler2D map, vec3 position, vec3 facing, mat2 turn, float repeats) {
          vec3 top = texture2D(map, turn * position.xz * repeats).rgb;
          vec3 side = texture2D(map, position.zy * repeats).rgb;
          vec3 front = texture2D(map, position.xy * repeats).rgb;
          return toLinearSpace(top * facing.y + side * facing.x + front * facing.z);
        }`,
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
        if (groundLayers.x + groundLayers.y + groundLayers.z + groundLayers.w > 0.) {
          vec3 duff = toLinearSpace(texture2D(groundDuff, vPositionW.xz * ${litter.repeatsPerMetre}).rgb) * vec3(${litter.tint.join(', ')});
          surfaceAlbedo = mix(surfaceAlbedo, duff, groundLayers.x * ${litter.strength});
          surfaceAlbedo *= mix(vec3(1.), vec3(${heath.tint.join(', ')}), groundLayers.y * ${heath.strength});
          surfaceAlbedo *= mix(vec3(1.), vec3(${moss.tint.join(', ')}), groundLayers.z * ${moss.strength});
          surfaceAlbedo *= mix(vec3(1.), vec3(${bracken.tint.join(', ')}), groundLayers.w * ${bracken.strength});
        }
        float coastAmount = shoreCover.x + shoreCover.y;
        if (coastAmount > 0.) {
          vec3 wetTint = 1. + shoreCover.z * vec3(-${wetSandTint.redLoss}, -${wetSandTint.greenLoss}, ${wetSandTint.blueGain});
          vec3 basinTint = 1. - shoreCover.w * vec3(${shellglass.redLoss}, ${shellglass.greenLoss}, ${shellglass.blueLoss});
          vec3 grains = toLinearSpace(texture2D(shoreGrains, vPositionW.xz * ${sand.repeatsPerMetre}).rgb);
          vec3 facing = pow(abs(normalize(vNormalW)), vec3(${triplanar.sharpness.toFixed(1)}));
          facing /= facing.x + facing.y + facing.z;
          mat2 bedding = mat2(${rock.cos}, -${rock.sin}, ${rock.sin}, ${rock.cos});
          vec3 sandstone = shoreTriplanar(shoreStone, vPositionW, facing, bedding, ${rock.repeatsPerMetre}) * vec3(${rock.red}, ${rock.green}, ${rock.blue});
          vec3 granite = shoreTriplanar(shoreGranite, vPositionW, facing, mat2(1.), ${granite.repeatsPerMetre}) * vec3(${granite.red}, ${granite.green}, ${granite.blue});
          vec3 stone = mix(sandstone, granite, smoothstep(${granite.heightStart.toFixed(1)}, ${granite.heightFull.toFixed(1)}, vPositionW.y));
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
