import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'
import type { Material } from '@babylonjs/core/Materials/material'
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer'
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture'
import { groundNoise } from './assets/effects/ground-noise'
import { roadNetwork } from './assets/geometry/road-kinds'
import { dirtRoadModel, roadSurfaceModel } from './assets/geometry/route-profiles'
import { environmentalMaterialPriority } from './assets/recipes/island-shader-presets'

// The road network's material: one gravel finish whose vertices say where they lie on the road, as
// signed distances to its edges. The fragment shader turns those into asphalt (paved carriageways
// and the apron where a graded road joins one), the paved roads' gravel shoulders, the earth
// carriageway with its crown, edges and ruts, and the verge. A turned, coarser second sample and
// world-space tone noise keep the gravel's repeat from showing.

export const roadFieldsAttribute = 'roadFields'
export const roadRutsAttribute = 'roadRuts'
export const roadFieldsSize = 4

const priority = environmentalMaterialPriority + 1
const { tint, ruts } = dirtRoadModel
const { breakup, edgeSoftM, rutWidth, rutStrength, asphalt, shoulder, tone } = roadSurfaceModel
// The lane nearest the edge that the earth tints as crown.
const innerLane = Math.max(...dirtRoadModel.lanes.filter((lane) => lane < 1))

// GLSL needs a decimal point on every float constant.
const f = (value: number) => (Number.isInteger(value) ? value.toFixed(1) : String(value))
const vec3Of = (values: readonly number[]) => `vec3(${values.map(f).join(', ')})`
const swing = 2

class RoadMaterial extends MaterialPluginBase {
  constructor(material: Material, private readonly gravel: BaseTexture | null) {
    super(material, 'Road network surface', priority)
    this._enable(true)
  }

  override getClassName() { return 'RoadMaterial' }
  override getAttributes(attributes: string[]) { attributes.push(roadFieldsAttribute, roadRutsAttribute) }
  override getSamplers(samplers: string[]) { samplers.push('roadGravel') }
  override bindForSubMesh(buffer: UniformBuffer) { if (this.gravel) buffer.setTexture('roadGravel', this.gravel) }

  override getCustomCode(type: string): Record<string, string> {
    const varyings = 'varying vec4 roadAt; varying float roadRut;'
    if (type === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `attribute vec4 ${roadFieldsAttribute}; attribute float ${roadRutsAttribute}; ${varyings}`,
        CUSTOM_VERTEX_MAIN_END: `roadAt = ${roadFieldsAttribute}; roadRut = ${roadRutsAttribute};`,
      }
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `${varyings}
        uniform sampler2D roadGravel;
        ${groundNoise}
        float roadInside(float distance) { return 1. - smoothstep(-${f(edgeSoftM)}, ${f(edgeSoftM)}, distance); }`,
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
        vec2 roadPlan = vPositionW.xz;
        vec3 roadBroad = groundNoise(roadPlan * ${f(1 / tone.broadM)});
        vec3 roadMid = groundNoise(roadPlan * ${f(1 / tone.midM)} + 5.3);
        // A coarser, turned sample of the same gravel, mixed in by patches, hides the repeat.
        mat2 roadTurn = mat2(${f(Math.cos(breakup.turn))}, ${f(-Math.sin(breakup.turn))}, ${f(Math.sin(breakup.turn))}, ${f(Math.cos(breakup.turn))});
        vec3 roadCoarse = toLinearSpace(texture2D(roadGravel, roadTurn * roadPlan * ${f(breakup.repeatsPerMetre)}).rgb);
        surfaceAlbedo = mix(surfaceAlbedo, roadCoarse, mix(${f(breakup.strength[0])}, ${f(breakup.strength[1])}, roadMid.x));
        surfaceAlbedo *= 1. + ${f(swing * tone.broad)} * (roadBroad.x - .5) + ${f(swing * tone.mid)} * (roadMid.x - .5);
        float onCarriageway = roadInside(roadAt.x);
        float onPaved = roadInside(roadAt.y);
        float onGraded = roadInside(roadAt.z);
        float inApron = 1. - smoothstep(${f(roadNetwork.apronM)} - ${f(edgeSoftM)}, ${f(roadNetwork.apronM)} + ${f(edgeSoftM)}, roadAt.y);
        float roadAsphalt = max(onPaved, inApron * onGraded);
        // Earth: crown in the middle, the edge tint at the carriageway's edge, ruts, then the verge.
        float lane = roadAt.w;
        vec3 earth = mix(${vec3Of(tint.crown)}, ${vec3Of(tint.edge)}, smoothstep(${f(innerLane)}, 1., lane));
        float rut = exp(-pow((lane - ${f(ruts)}) / ${f(rutWidth)}, 2.)) * roadRut * ${f(rutStrength)};
        earth = mix(earth, ${vec3Of(tint.rut)}, rut);
        earth = mix(${vec3Of(tint.verge)}, earth, onCarriageway);
        // A paved road's shoulder is gravel, not earth.
        vec3 roadTint = mix(earth, ${vec3Of(shoulder.tint)}, (1. - onGraded) * (1. - onPaved));
        float grey = dot(surfaceAlbedo, vec3(.3, .59, .11));
        // Asphalt: the gravel's own speckle, darkened and greyed, in broad patches of wear and repair.
        vec3 roadTar = ${vec3Of(asphalt.tint)} * mix(1., grey * 2., ${f(asphalt.contrast)})
          * (1. + ${f(swing * asphalt.patches)} * (roadBroad.x * .6 + roadMid.x * .4 - .5));
        surfaceAlbedo = mix(surfaceAlbedo * roadTint, roadTar, roadAsphalt);`,
    }
  }
}

// A road material: the gravel recipe's own material, cloned so footpaths sharing it are untouched.
export function createRoadMaterial(gravel: Material & { albedoTexture?: BaseTexture | null }) {
  const material = gravel.clone('Road network') as Material & { albedoTexture?: BaseTexture | null }
  new RoadMaterial(material, material.albedoTexture ?? null)
  // The skirt is seen from either side.
  material.backFaceCulling = false
  return material
}
