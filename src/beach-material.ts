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
// Rows of blocks lie between long (sheet) joints: row r runs from joint r to joint r + 1.
// Nothing about a block may change sharply except behind an open crack, or the rock looks stitched.
const graniteGround = `
// Where a row's cross joints fall, counted in blocks along the grain. Each row shifts its cross
// joints and leans them by up to skewDeg its own way, so blocks are uneven quadrilaterals.
float graniteCross(float row, float sheet, float along) {
  float lean = (groundHash(vec2(row, 8.1)) - .5) * ${f(swing * Math.tan(blocks.skewDeg * Math.PI / degreesPerHalfTurn) * blocks.sheetSpacingM / blocks.crossSpacingM)};
  return along * ${f(1 / blocks.crossSpacingM)} + groundHash(vec2(row, 3.1)) * 7. + (sheet - row) * lean;
}
// A long joint sits off its even spacing by up to spacingJitter either way.
float graniteSheet(float joint) {
  return joint + (groundHash(vec2(joint, 1.7)) - .5) * ${f(swing * blocks.spacingJitter)};
}
// A block's own tone and tilt, from its row and its place along the row.
vec2 graniteBlock(float row, float cell) {
  float id = groundHash(vec2(row, cell));
  return vec2(id, fract(id * 7.31));
}
// How far a long joint opens along one block of the row below it: shut, or sheetOpenMin to sheetOpenMax of a full crack.
float sheetBlockOpening(float joint, float cell) {
  float id = groundHash(vec2(joint, cell) + 9.2);
  return step(${f(blocks.closedSheetShare)}, id) * (${f(blocks.sheetOpenMin)} + (id - ${f(blocks.closedSheetShare)}) * ${f((blocks.sheetOpenMax - blocks.sheetOpenMin) / (1 - blocks.closedSheetShare))});
}
// A long joint's opening here. It changes block by block, easing at each block's ends so cracks thin out.
// Both rows beside the joint count blocks in the row below it, so they agree on the answer.
float sheetOpening(float joint, float sheet, float along) {
  float at = graniteCross(joint - 1., sheet, along);
  float cell = floor(at), t = fract(at);
  float here = sheetBlockOpening(joint, cell);
  float start = mix(sheetBlockOpening(joint, cell - 1.), here, .5);
  float end = mix(here, sheetBlockOpening(joint, cell + 1.), .5);
  return t < .5 ? mix(start, here, smoothstep(0., ${f(blocks.jointEndShare)}, t)) : mix(here, end, smoothstep(${f(1 - blocks.jointEndShare)}, 1., t));
}
// A crack's profile across it: 1 at its middle, 0 beyond its width.
float graniteCrack(float gap, float width) {
  return (1. - smoothstep(0., max(width, 1e-4), gap)) * step(1e-4, width);
}
// How strongly a crack shades and shapes the light: a hairline that is about to close fades out
// rather than ending as a dark point, so its tip doesn't shimmer.
float crackStrength(float opening) {
  return smoothstep(0., ${f(blocks.sheetOpenMin)}, opening);
}
vec3 graniteGround(vec2 p, float bedrock, float cover, float detail, vec3 crystals, vec3 broad, vec3 mid, float fine, out vec2 slope) {
  // Joints in two sets: long joints along the grain, shorter cross joints between them,
  // staggered row to row. The lines wander with the noise, so no two blocks match.
  mat2 grain = mat2(${f(Math.cos(jointTurn))}, ${f(-Math.sin(jointTurn))}, ${f(Math.sin(jointTurn))}, ${f(Math.cos(jointTurn))});
  // Joints bend only over metres: the broad and mid noise move them, never the fine.
  vec2 g = grain * p + (vec2(mid.x * .7 + broad.x * .3, broad.x * .7 + mid.x * .3) - .5) * ${f(swing * blocks.wanderM)};
  float sheet = g.y * ${f(1 / blocks.sheetSpacingM)};
  float k = floor(sheet + .5);
  float row = sheet < graniteSheet(k) ? k - 1. : k;
  float toBelow = (sheet - graniteSheet(row)) * ${f(blocks.sheetSpacingM)};
  float toAbove = (graniteSheet(row + 1.) - sheet) * ${f(blocks.sheetSpacingM)};
  // Far off, where cracks have faded, every use of the openings is multiplied by detail, so skip them.
  float openBelow = detail > 0. ? sheetOpening(row, sheet, g.x) : 0.;
  float openAbove = detail > 0. ? sheetOpening(row + 1., sheet, g.x) : 0.;
  // Near a shut long joint a block's tone and tilt fade to a field both rows share. Beyond the
  // distance where cracks fade out, every joint counts as shut, so no step shows without its crack.
  // The step fades with distance exactly as the crack's shade does.
  float keep = mix(smoothstep(0., ${f(blocks.featherM)}, toBelow), 1., crackStrength(openBelow) * detail)
    * mix(smoothstep(0., ${f(blocks.featherM)}, toAbove), 1., crackStrength(openAbove) * detail);
  // A cross crack thins out over a shorter reach, so it still meets a shut long joint nearly full width.
  float crossReach = mix(smoothstep(0., ${f(blocks.crackTaperM)}, toBelow), 1., crackStrength(openBelow))
    * mix(smoothstep(0., ${f(blocks.crackTaperM)}, toAbove), 1., crackStrength(openAbove));
  float crossAt = graniteCross(row, sheet, g.x);
  float crossJoint = floor(crossAt + .5);
  // In blocks, from the nearest cross joint: negative before it, positive past it.
  float fromCross = crossAt - crossJoint;
  // Many cross joints stay shut, so slabs run long. Across a shut one a block ramps into the next;
  // an open one steps, behind its crack.
  float crossOpen = step(${f(blocks.closedCrossShare)}, groundHash(vec2(row, crossJoint) + 5.3));
  float past = mix(smoothstep(-.5, .5, fromCross), step(0., fromCross), crossOpen * detail);
  vec2 rowBlock = mix(graniteBlock(row, crossJoint - 1.), graniteBlock(row, crossJoint), past);
  // The shared field has its own tone and tilt, so a shut joint doesn't level into a groove.
  vec2 blockScale = g * vec2(${f(1 / blocks.crossSpacingM)}, ${f(1 / blocks.sheetSpacingM)});
  vec2 field = vec2(groundNoise(blockScale + 4.7).x, groundNoise(blockScale + 21.9).x);
  vec2 block = mix(field, rowBlock, keep);
  // Joints open by different amounts. A cross crack thins out where it meets a shut long joint.
  float crackWidth = ${f(blocks.jointWidthM)} * (.3 + 1.4 * fine) * (.5 + mid.x);
  float crossOpening = crossOpen * crossReach;
  float crossCrack = graniteCrack(abs(fromCross) * ${f(blocks.crossSpacingM)}, crackWidth * crossOpening);
  float crackBelow = graniteCrack(toBelow, crackWidth * openBelow);
  float crackAbove = graniteCrack(toAbove, crackWidth * openAbove);
  vec3 strength = vec3(crackStrength(crossOpening), crackStrength(openBelow), crackStrength(openAbove));
  float joint = max(crossCrack * strength.x, max(crackBelow * strength.y, crackAbove * strength.z));
  // A joint's walls slope up toward the middle of each block. Every crack adds its own slope,
  // which is zero at the crack's middle, so the light never switches from one joint to another.
  vec2 walls = vec2(sign(fromCross) * crossCrack * (1. - crossCrack) * strength.x,
    crackBelow * (1. - crackBelow) * strength.y - crackAbove * (1. - crackAbove) * strength.z);
  vec2 jointSlope = (walls * grain) * ${f(blocks.jointRelief)} * 4.;
  vec2 tilt = (block - .5) * ${f(swing * blocks.tilt)};
  // Weathered faces are rough at a hand's breadth: one more octave, near the eye only.
  vec3 rough = detail > 0. ? groundNoise(p * ${f(1 / blocks.roughM)} + 11.3) : vec3(.5, 0., 0.);
  float roughness = mix(.5, rough.x, detail);
  // Pale grey-green lichen crusts and dark weathering blotches on the open faces.
  float lichenCover = smoothstep(${f(lichen.start)}, ${f(lichen.full)}, mid.x * .4 + roughness * .2 + fine * .2 + block.x * .2) * ${f(lichen.cover)};
  float stain = smoothstep(${f(stain.start)}, ${f(stain.full)}, fine * .6 + (1. - roughness) * .4) * ${f(stain.cover)};
  // On bedrock the crystals are only grain under the joints, so their speckle is calmed toward its mean.
  vec3 grainOnRock = mix(${vec3Of(highwoodGranite.crystalMean)} * ${vec3Of(highwoodGranite.tint)}, crystals, ${f(blocks.crystalContrast)} * mix(.5, 1., roughness));
  vec3 bedrockAlbedo = grainOnRock * (1. + (block.x - .5) * ${f(swing * blocks.toneSpread)} + (roughness - .5) * ${f(swing * blocks.roughTone)})
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
