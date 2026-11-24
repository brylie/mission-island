import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'
import type { Material } from '@babylonjs/core/Materials/material'
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer'
import { groundNoise } from './assets/effects/ground-noise'
import { groundVariation, highwoodGranite, highwoodGroundCover, starterShoreFinish } from './assets/geometry/starter-landscape'
import { environmentalMaterialPriority } from './assets/recipes/island-shader-presets'
import type { MeshFactory } from './island-meshes'
import { highwoodGeneration } from './worlds/starter/layout/island-generation'
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
const { blocks, grus, lichen, stain } = highwoodGranite
const degreesPerHalfTurn = 180
// The long joints follow Cairn Summit's granite core, the first uplift core, so they run along its ridge.
const [cairnCore] = highwoodGeneration.uplift.cores
const jointTurn = Math.atan2(cairnCore.to.z - cairnCore.from.z, cairnCore.to.x - cairnCore.from.x)

// GLSL needs a decimal point on every float constant.
const float = (value: number) => Number.isInteger(value) ? value.toFixed(1) : String(value)
const vec3Of = (values: readonly number[]) => `vec3(${values.map(float).join(', ')})`
const f = float
// A 0–1 noise or hash doubles to swing ±1 around its middle.
const swing = 2

// Granite ground: jointed bedrock on the steepest ground, grus gravel on gentler rock,
// both over the crystal texture. Returns the albedo and writes the surface slope
// (rise per metre, along x and z) that relief adds to the normal.
const graniteGround = `
vec3 graniteGround(vec2 p, float bedrock, float cover, float detail, vec3 crystals, vec3 broad, vec3 mid, float fine, out vec2 slope) {
  // Joints in two sets: long joints along the grain, shorter cross joints between them,
  // staggered row to row. The lines wander with the noise, so no two blocks match.
  mat2 grain = mat2(${f(Math.cos(jointTurn))}, ${f(-Math.sin(jointTurn))}, ${f(Math.sin(jointTurn))}, ${f(Math.cos(jointTurn))});
  // Joints bend only over metres: the broad and mid noise move them, never the fine.
  vec2 g = grain * p + (vec2(mid.x * .7 + broad.x * .3, broad.x * .7 + mid.x * .3) - .5) * ${f(swing * blocks.wanderM)};
  // Each long joint sits off its even spacing by up to spacingJitter either way.
  float sheet = g.y * ${f(1 / blocks.sheetSpacingM)};
  float k = floor(sheet + .5);
  float jointK = k + (groundHash(vec2(k, 1.7)) - .5) * ${f(swing * blocks.spacingJitter)};
  float other = sheet < jointK ? k - 1. : k + 1.;
  float jointOther = other + (groundHash(vec2(other, 1.7)) - .5) * ${f(swing * blocks.spacingJitter)};
  float row = sheet < jointK ? k - 1. : k;
  float nearSheet = abs(sheet - jointK) < abs(sheet - jointOther) ? jointK : jointOther;
  // Cross joints lean by up to skewDeg, a different way in each row, so blocks are uneven quadrilaterals.
  float lean = (groundHash(vec2(row, 8.1)) - .5) * ${f(swing * Math.tan(blocks.skewDeg * Math.PI / degreesPerHalfTurn) * blocks.sheetSpacingM / blocks.crossSpacingM)};
  float crossAt = g.x * ${f(1 / blocks.crossSpacingM)} + groundHash(vec2(row, 3.1)) * 7. + (sheet - row) * lean;
  float id = groundHash(vec2(row, floor(crossAt)));
  float crossGap = (fract(crossAt) - .5) * ${f(blocks.crossSpacingM)};
  vec2 toJoint = vec2(${f(blocks.crossSpacingM / swing)} - abs(crossGap), abs(sheet - nearSheet) * ${f(blocks.sheetSpacingM)});
  // Joints open by different amounts; some sheet joints and many cross joints stay closed, so slabs run long.
  float sheetOpen = groundHash(vec2(nearSheet, floor(g.x * ${f(1 / blocks.crossSpacingM)}) + 9.2));
  float crossOpen = step(${f(blocks.closedCrossShare)}, groundHash(vec2(row, floor(crossAt + .5)) + 5.3));
  vec2 width = ${f(blocks.jointWidthM)} * (.3 + 1.4 * fine) * (.5 + mid.x)
    * vec2(crossOpen, step(${f(blocks.closedSheetShare)}, sheetOpen) * (.4 + sheetOpen));
  vec2 joints = (1. - smoothstep(vec2(0.), max(width, vec2(1e-4)), toJoint)) * step(vec2(1e-4), width);
  float joint = max(joints.x, joints.y);
  // A joint's walls slope up toward the middle of each block.
  vec2 across = joints.x > joints.y ? vec2(-sign(crossGap), 0.) : vec2(0., sign(sheet - nearSheet));
  vec2 jointSlope = (across * grain) * ${f(blocks.jointRelief)} * joint * (1. - joint) * 4.;
  vec2 tilt = (vec2(id, fract(id * 7.31)) - .5) * ${f(swing * blocks.tilt)};
  // Weathered faces are rough at a hand's breadth: one more octave, near the eye only.
  vec3 rough = detail > 0. ? groundNoise(p * ${f(1 / blocks.roughM)} + 11.3) : vec3(.5, 0., 0.);
  float roughness = mix(.5, rough.x, detail);
  // Pale grey-green lichen crusts and dark weathering blotches on the open faces.
  float lichenCover = smoothstep(${f(lichen.start)}, ${f(lichen.full)}, mid.x * .4 + roughness * .2 + fine * .2 + id * .2) * ${f(lichen.cover)};
  float stain = smoothstep(${f(stain.start)}, ${f(stain.full)}, fine * .6 + (1. - roughness) * .4) * ${f(stain.cover)};
  // On bedrock the crystals are only grain under the joints, so their speckle is calmed toward its mean.
  vec3 grainOnRock = mix(${vec3Of(highwoodGranite.crystalMean)} * ${vec3Of(highwoodGranite.tint)}, crystals, ${f(blocks.crystalContrast)} * mix(.5, 1., roughness));
  vec3 bedrockAlbedo = grainOnRock * (1. + (id - .5) * ${f(swing * blocks.toneSpread)} + (roughness - .5) * ${f(swing * blocks.roughTone)})
    * mix(vec3(1.), ${vec3Of(lichen.tint)}, lichenCover)
    * mix(vec3(1.), ${vec3Of(stain.tint)}, stain)
    * mix(1., ${f(blocks.jointShade)}, joint * detail);
  vec2 bedrockSlope = tilt + (jointSlope + rough.yz * ${f(blocks.roughRelief / blocks.roughM)}) * detail;

  // Grus: rounded clasts in gritty sand, faded to their average with distance.
  vec3 grusSand = crystals * ${vec3Of(grus.sand)};
  vec3 grusAlbedo = grusSand;
  vec2 grusSlope = vec2(0.);
  if (detail > 0. && bedrock < 1.) {
    vec2 clast; float clastId;
    groundCells(p * ${f(1 / grus.sizeM)}, clast, clastId);
    float radius = ${f(grus.stoneRadius)} * (${f(1 - grus.sizeSpread)} + ${f(swing * grus.sizeSpread)} * fract(clastId * 13.7));
    float reach = dot(clast, clast) / (radius * radius);
    // Clasts show only where rock is the main cover, so they don't dot the turf edge.
    float stone = (1. - smoothstep(1. - ${f(grus.stoneEdge)}, 1., reach)) * smoothstep(${f(grus.coverFrom)}, ${f(grus.coverFull)}, cover);
    vec3 pebble = crystals * (1. + (clastId - .5) * ${f(swing * grus.toneSpread)});
    vec3 grusNear = mix(grusSand * ${f(highwoodGranite.cavity)}, pebble, stone);
    vec3 average = mix(grusSand, crystals, ${f(grus.stoneRadius * grus.stoneRadius * Math.PI)});
    grusAlbedo = mix(average, grusNear, detail);
    // Each clast is a dome: steepest, at domeRelief, at its rim.
    grusSlope = clast / radius * ${f(grus.domeRelief)} * stone * detail;
  }
  slope = mix(grusSlope, bedrockSlope, bedrock)
    + broad.yz * ${f(highwoodGranite.relief.broad / groundVariation.broadM)}
    + mid.yz * ${f(highwoodGranite.relief.mid / groundVariation.midM)};
  float tone = 1. + (broad.x - .5) * ${f(swing * highwoodGranite.tone.broad)} + (mid.x - .5) * ${f(swing * highwoodGranite.tone.mid)};
  return mix(grusAlbedo, bedrockAlbedo, bedrock) * tone;
}`

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
        ${groundNoise}
        // Samples a texture from above and from both sides, weighted by the surface's facing.
        vec3 shoreTriplanar(sampler2D map, vec3 position, vec3 facing, mat2 turn, float repeats) {
          vec3 top = texture2D(map, turn * position.xz * repeats).rgb;
          vec3 side = texture2D(map, position.zy * repeats).rgb;
          vec3 front = texture2D(map, position.xy * repeats).rgb;
          return toLinearSpace(top * facing.y + side * facing.x + front * facing.z);
        }
        ${graniteGround}`,
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
        vec2 groundAt = vPositionW.xz;
        float groundEye = distance(vPositionW, vEyePosition.xyz);
        float groundDetail = 1. - smoothstep(${f(groundVariation.detailFade[0])}, ${f(groundVariation.detailFade[1])}, groundEye);
        float groundRelief = 1. - smoothstep(${f(groundVariation.reliefFade[0])}, ${f(groundVariation.reliefFade[1])}, groundEye);
        vec3 groundBroad = groundNoise(groundAt * ${f(1 / groundVariation.broadM)});
        vec3 groundMid = groundNoise(groundAt * ${f(1 / groundVariation.midM)} + 7.1);
        // Fine mottling stays farther than clasts: a metre-wide patch is still a few pixels at 100 m.
        float groundFineReach = 1. - smoothstep(${f(groundVariation.fineFade[0])}, ${f(groundVariation.fineFade[1])}, groundEye);
        float groundFine = groundFineReach > 0. ? mix(.5, groundNoise(groundAt * ${f(1 / groundVariation.fineM)} + 3.7).x, groundFineReach) : .5;
        // Turf and cover vary at three scales, warmer or cooler in broad patches.
        float groundWarmth = groundBroad.x * 2. - 1.;
        surfaceAlbedo *= (1. + ${f(groundVariation.tone.broad)} * groundWarmth + ${f(swing * groundVariation.tone.mid)} * (groundMid.x - .5) + ${f(swing * groundVariation.tone.fine)} * (groundFine - .5))
          * (1. + ${vec3Of(groundVariation.warmth)} * groundWarmth);
        if (groundLayers.x + groundLayers.y + groundLayers.z + groundLayers.w > 0.) {
          // Each layer lies in its own clumps: litter under the mid noise, moss in its gaps.
          vec4 clumps = vec4(groundMid.x * .7 + groundFine * .3, groundBroad.x * .5 + groundFine * .5,
            (1. - groundMid.x) * .7 + groundFine * .3, groundMid.x * .5 + groundBroad.x * .5);
          vec4 layers = clamp(groundLayers * (1. + (clumps * 2. - 1.) * ${f(groundVariation.coverPatch)}), 0., 1.);
          vec3 fine = texture2D(groundDuff, vPositionW.xz * ${f(litter.repeatsPerMetre)}).rgb;
          vec3 coarse = texture2D(groundDuff, mat2(${rock.cos}, -${rock.sin}, ${rock.sin}, ${rock.cos}) * vPositionW.xz * ${f(litter.breakupRepeatsPerMetre)}).rgb;
          float breakup = mix(${f(groundVariation.litterBreakup[0])}, ${f(groundVariation.litterBreakup[1])}, groundMid.x);
          vec3 duff = toLinearSpace(mix(fine, coarse, breakup)) * ${vec3Of(litter.tint)};
          surfaceAlbedo = mix(surfaceAlbedo, duff, layers.x * ${f(litter.strength)});
          surfaceAlbedo *= mix(vec3(1.), ${vec3Of(heath.tint)}, layers.y * ${f(heath.strength)});
          surfaceAlbedo *= mix(vec3(1.), ${vec3Of(moss.tint)}, layers.z * ${f(moss.strength)});
          surfaceAlbedo *= mix(vec3(1.), ${vec3Of(bracken.tint)}, layers.w * ${f(bracken.strength)});
        }
        // Bare rock breaks into the turf in patches rather than following the slope blend.
        // The noise moves the middle of the blend only: no rock stays none, full rock stays full.
        float rockEdge = 4. * shoreCover.y * (1. - shoreCover.y);
        float rockShare = min(clamp(shoreCover.y + (groundMid.x * .6 + groundFine * .4 - .5) * rockEdge * ${f(swing * groundVariation.rockJitter)}, 0., 1.), 1. - shoreCover.x);
        float coastAmount = shoreCover.x + rockShare;
        if (coastAmount > 0.) {
          vec3 wetTint = 1. + shoreCover.z * vec3(-${wetSandTint.redLoss}, -${wetSandTint.greenLoss}, ${wetSandTint.blueGain});
          vec3 basinTint = 1. - shoreCover.w * vec3(${shellglass.redLoss}, ${shellglass.greenLoss}, ${shellglass.blueLoss});
          vec3 grains = toLinearSpace(texture2D(shoreGrains, vPositionW.xz * ${sand.repeatsPerMetre}).rgb);
          vec3 facing = pow(abs(normalize(vNormalW)), vec3(${triplanar.sharpness.toFixed(1)}));
          facing /= facing.x + facing.y + facing.z;
          mat2 bedding = mat2(${rock.cos}, -${rock.sin}, ${rock.sin}, ${rock.cos});
          vec3 sandstone = shoreTriplanar(shoreStone, vPositionW, facing, bedding, ${rock.repeatsPerMetre}) * vec3(${rock.red}, ${rock.green}, ${rock.blue});
          float graniteShare = smoothstep(${granite.heightStart.toFixed(1)}, ${granite.heightFull.toFixed(1)}, vPositionW.y);
          vec3 stone = sandstone;
          vec2 stoneSlope = vec2(0.);
          if (graniteShare > 0. && rockShare > 0.) {
            vec3 crystals = shoreTriplanar(shoreGranite, vPositionW, facing, bedding, ${f(highwoodGranite.crystalRepeatsPerMetre)}) * ${vec3Of(highwoodGranite.tint)};
            float bedrock = smoothstep(${f(highwoodGranite.bedrockFrom)}, ${f(highwoodGranite.bedrockFull)}, shoreCover.y + (groundMid.x - .5) * ${f(highwoodGranite.bedrockJitter)});
            vec3 graniteAlbedo = graniteGround(groundAt, bedrock, rockShare, groundDetail, crystals, groundBroad, groundMid, groundFine, stoneSlope);
            stone = mix(sandstone, graniteAlbedo, graniteShare);
            stoneSlope *= graniteShare * groundRelief;
          }
          surfaceAlbedo = surfaceAlbedo * (1. - coastAmount)
            + grains * wetTint * basinTint * shoreCover.x
            + stone * wetTint * rockShare;
          #ifdef NORMAL
            // Stone takes the ground's own normal, tipped by its joints, blocks and clasts.
            vec3 groundNormal = normalize(vNormalW);
            // Sand flattens the turf's bump too, but only rock adds relief.
            vec3 tip = vec3(stoneSlope.x, 0., stoneSlope.y) * rockShare / coastAmount;
            tip -= groundNormal * dot(groundNormal, tip);
            vec3 stoneNormal = normalize(groundNormal - tip);
            normalW = normalize(mix(normalW, stoneNormal, coastAmount));
          #endif
        }`,
    }
  }
}

export function useBeachMaterial(material: Material, meshes: MeshFactory) {
  new BeachMaterial(material, meshes)
}
