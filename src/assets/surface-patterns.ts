import { gameplayPatterns } from './gameplay-surface-patterns.ts'
import { blend, hash, valueNoise, wrap } from '../math/noise.ts'
import { groundSurfaceTuning } from './recipes/standard-ground-tuning.ts'
import { materialSurfaceTuning } from './recipes/standard-material-tuning.ts'
import { cell, fraction, smooth, wave, type Point, type Sample } from './surface-pattern-tools.ts'
import type { StandardSurfaceId, SurfaceRecipe, SurfaceSettings } from './surface-recipes.ts'

function turf({ u, v, n, seed, wear, patch, fine }: Point, dry: boolean): Sample {
  const tuning = groundSurfaceTuning.turf
  const tuft = cell(u, v, n, seed)
  const density = dry
    ? patch * tuning.dry.densityPatch + tuft.tone * tuning.dry.densityTuft
    : tuft.tone * tuning.meadow.densityTuft + fine * tuning.meadow.densityFine + patch * tuning.meadow.densityPatch
  const cover = smooth(tuning.coverStart + tuning.coverStartWear * wear, tuning.coverEnd + tuning.coverEndWear * wear, density)
  const lean = tuft.tone - tuning.tuftToneMidpoint
  const bend = lean * tuning.leanStrength + tuft.dx * tuning.neighboringBladeLean
  const blades = wave((tuft.dx + tuft.dy * bend) * tuning.bladeFrequency + tuft.tone) ** tuning.bladeSharpness
  const clump = (1 - smooth(tuning.tuftCoreRadius, tuning.tuftOuterRadius, tuft.distance)) * smooth(tuning.clumpEdgeStart, tuning.clumpEdgeEnd, tuft.edge)
  const height = cover * (tuning.baseHeight + clump * (tuning.clumpHeight + blades * tuning.bladeHeight))
  const finish = dry ? tuning.dry : tuning.meadow
  const soil = (1 - cover) * finish.bareSoil
  const tone = finish.baseTone + cover * finish.coverTone + height * finish.heightTone
  return [height + tuning.fineRelief * fine, dry ? tone + tuning.dry.patchTone * patch : tone, soil]
}

function needleScatter(u: number, v: number, n: number, seed: number, fan: boolean) {
  const tuning = groundSurfaceTuning.needleScatter
  let height = 0, tips = 0
  for (let layer = 0; layer < tuning.layers; layer++) {
    const twig = cell(u + layer * tuning.layerOffsetU, v - layer * tuning.layerOffsetV, n, seed + layer * tuning.layerSeedStep)
    const angle = fan ? tuning.fanAngleOffset + twig.tone : twig.tone * tuning.scatterAngleSpan
    const along = twig.dx * Math.cos(angle) + twig.dy * Math.sin(angle)
    const across = twig.dy * Math.cos(angle) - twig.dx * Math.sin(angle)
    const rake = fan ? Math.abs(across) * tuning.fanRake - along : along
    const blade = (1 - smooth(tuning.coreLength, tuning.fullLength, Math.abs(along)))
      * (fan
        ? smooth(tuning.fanBladeStart, tuning.fanBladeEnd, wave(rake * tuning.fanFrequency))
        * (1 - smooth(tuning.fanCoreWidth, tuning.fanFullWidth, Math.abs(across)))
        : 1 - smooth(tuning.needleCoreWidth, tuning.needleFullWidth, Math.abs(across + along * along * tuning.needleCurvature)))
    height = Math.max(height, blade * (tuning.bladeBaseHeight + twig.tone * tuning.bladeToneHeight))
    tips = Math.max(tips, blade * smooth(tuning.tipStart, tuning.tipEnd, Math.abs(along)))
  }
  return { height, tips }
}

function aggregate({ u, v, n, seed, wear, fine }: Point, kind: 'chips' | 'scree' | 'cobbles'): Sample {
  const tuning = groundSurfaceTuning.aggregate
  const angular = kind !== 'cobbles'
  const chips = kind === 'chips'
  const warp = valueNoise(u, v, tuning.warpCells, seed + tuning.warpSeedOffset) * tuning.warpShiftU
  const faceting = kind === 'scree' ? tuning.screeFaceting : chips ? tuning.chipFaceting : 0
  const stone = cell(u + warp, v - warp * tuning.warpStretchV, n, seed, faceting)
  const crown = angular
    ? tuning.angularCrownBase + tuning.angularCrownRelief * smooth(
      -tuning.crownSlopeInset,
      tuning.crownSlopeEnd,
      stone.dx * tuning.crownAcrossSlope - stone.dy * (stone.tone + tuning.crownToneSlopeOffset),
    )
    : 1 - smooth(tuning.cobbleCrownCore, tuning.cobbleCrownRadius, stone.distance) * tuning.cobbleCrownFalloff
  const joint = chips ? tuning.chipJointWidth + wear * tuning.chipJointWear : tuning.stoneJointWidth + wear * tuning.stoneJointWear
  const rim = smooth(joint, joint + (angular ? tuning.angularRimWidth : tuning.cobbleRimWidth), stone.edge)
  const body = chips
    ? rim * (1 - smooth(tuning.chipCoreRadius, tuning.chipOuterRadius + stone.tone * tuning.chipToneRadius, stone.distance))
    : rim
  const fractured = kind === 'scree' ? smooth(tuning.fractureStart, tuning.fractureEnd, fine) * wear * tuning.fractureDepth : 0
  const height = body * (crown * (tuning.stoneBaseHeight + stone.tone * tuning.stoneToneHeight) - fractured)
  return [
    height * (chips ? 1 - wear * tuning.chipWearDepth : 1) + fine * tuning.fineRelief,
    tuning.surfaceBaseTone + body * (tuning.bodyBaseTone + stone.tone * tuning.stoneToneWeight) + fine * tuning.fineTone,
    angular ? (1 - body) * wear * tuning.angularJointAccent : (1 - body) * tuning.cobbleJointAccent,
  ]
}

function strata({ u, v, n, seed, wear, patch, fine }: Point, slate: boolean): Sample {
  const tuning = groundSurfaceTuning.strata
  const bedding = slate ? tuning.slate : tuning.sandstone
  const warp = valueNoise(u, v, bedding.warpCellsU, seed + tuning.warpSeedOffset, bedding.warpCellsV)
  const phase = v * n + u * bedding.shear + warp * bedding.warpHeight
  const layer = fraction(phase)
  const edge = smooth(tuning.layerLipStart, tuning.layerLipEnd + wear * tuning.layerLipWear, layer)
  const step = slate
    ? edge * (1 - tuning.slateTaper * layer)
    : wave(phase) * tuning.beddingHeight + wave(phase * tuning.beddingHarmonic) * tuning.beddingHarmonicHeight
  const erosion = smooth(tuning.erosionStart, tuning.erosionEnd, fine * tuning.erosionFineMix + patch * tuning.erosionPatchMix) * wear
  return [
    step * (tuning.bedHeight - erosion * tuning.erosionDepth) + bedding.fineRelief * fine,
    tuning.baseTone + step * tuning.stepTone + fine * tuning.fineTone,
    erosion * step * tuning.erosionAccent,
  ]
}

const standardPatterns: Record<StandardSurfaceId, (p: Point) => Sample> = {
  'meadow-turf': (p) => turf(p, false),
  'dry-turf': (p) => turf(p, true),
  'pine-duff': ({ u, v, n, seed, wear, fine }) => {
    const tuning = groundSurfaceTuning.pineDuff
    const litter = needleScatter(u, v, n, seed, false)
    const height = litter.height * (tuning.baseLitterHeight - smooth(tuning.decompositionStart, tuning.decompositionEnd, fine) * wear)
    return [height + tuning.fineRelief * fine, tuning.baseTone + height * tuning.litterTone, litter.tips * tuning.tipAccent]
  },
  'path-gravel': (p) => aggregate(p, 'chips'),
  'scree': (p) => aggregate(p, 'scree'),
  'cobbles': (p) => aggregate(p, 'cobbles'),
  'dry-beach': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = groundSurfaceTuning.dryBeach
    const grain = valueNoise(u, v, n, seed + tuning.grainSeedOffset)
    const scour = valueNoise(u, v, tuning.scourCellsU, seed + tuning.scourSeedOffset, tuning.scourCellsV)
    const shell = smooth(tuning.shellStart, tuning.shellEnd, grain) * (1 - tuning.shellWear * wear)
    return [
      grain * tuning.grainHeight + scour * wear * tuning.scourHeight,
      tuning.baseTone + grain * tuning.grainTone + patch * tuning.patchTone + fine * tuning.fineTone,
      shell,
    ]
  },
  'rippled-sand': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = groundSurfaceTuning.rippledSand
    const phase = v * n + valueNoise(u, v, tuning.phaseWarpCells, seed + tuning.phaseWarpSeedOffset) * tuning.phaseWarp
    const crest = wave(phase + tuning.crestAsymmetry * wave(phase)) ** (tuning.crestExponent + wear * tuning.wearSharpening)
    const height = crest * (1 - tuning.weatheredTroughDepth * patch * wear)
    const tone = tuning.baseTone + height * tuning.heightTone + fine * tuning.fineTone
    return [height + tuning.fineRelief * fine, tone, crest * tuning.crestAccent]
  },
  'estuary-silt': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = groundSurfaceTuning.estuarySilt
    const mud = cell(u + patch * tuning.patchShiftU, v - patch * tuning.patchShiftV, n, seed, tuning.plateFaceting)
    const crust = smooth(tuning.crustStart, tuning.crustEnd + tuning.crustWear * wear, mud.edge)
    const rim = (1 - smooth(tuning.rimStart, tuning.rimEnd, mud.edge)) * crust
    return [
      crust * tuning.crustHeight + rim * wear * tuning.rimHeight + fine * tuning.fineRelief,
      tuning.baseTone + crust * (tuning.crustTone + tuning.plateTone * mud.tone),
      rim * tuning.rimAccent,
    ]
  },
  'poured-concrete': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = materialSurfaceTuning.pouredConcrete
    const pore = cell(u, v, n, seed)
    const pitRadius = tuning.pitOuterRadius + wear * tuning.pitWearSpread
    const pit = (1 - smooth(tuning.pitCoreRadius, pitRadius, pore.distance)) * smooth(tuning.pitToneStart, tuning.pitToneEnd, pore.tone)
    return [
      tuning.baseHeight + fine * tuning.fineRelief - pit * tuning.pitDepth,
      tuning.baseTone + patch * tuning.patchTone + fine * tuning.fineTone,
      pit * tuning.pitAccent,
    ]
  },
  'lime-plaster': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = materialSurfaceTuning.limePlaster
    // Integer shear keeps each edge continuous across the repeat.
    const strokes = valueNoise(u + v, v + tuning.strokePatchShift * patch, n / tuning.strokeAspectRatio, seed + tuning.strokeSeedOffset, n)
    const flake = smooth(tuning.flakeStart, tuning.flakeEnd - wear * tuning.flakeWear, strokes)
    return [
      tuning.baseHeight + tuning.strokeHeight * strokes + flake * tuning.flakeHeight + tuning.fineRelief * fine,
      tuning.baseTone + tuning.strokeTone * strokes + tuning.patchTone * patch,
      flake * (tuning.flakeAccent + tuning.patchAccent * patch),
    ]
  },
  'brick': ({ u, v, n, seed, wear, fine }) => {
    const tuning = materialSurfaceTuning.brick
    const row = Math.floor(v * n)
    const x = u * (n / tuning.widthToHeight) + wrap(row, tuning.staggerPeriod) * tuning.staggerOffset
    const tone = hash(wrap(Math.floor(x), n / tuning.widthToHeight), wrap(row, n), seed)
    const a = fraction(x), b = fraction(v * n)
    const lip = Math.min(a * tuning.widthToHeight, (1 - a) * tuning.widthToHeight, b, 1 - b) + (fine - tuning.fineMidpoint) * wear * tuning.chipWear
    const clay = smooth(tuning.mortarStart, tuning.mortarEnd + wear * tuning.mortarWear, lip)
    return [
      clay * (tuning.clayBaseHeight + tuning.clayToneHeight * tone) + fine * tuning.fineRelief,
      tuning.mortarTone + clay * (tuning.clayBaseTone + tone * tuning.clayToneWeight),
      1 - clay,
    ]
  },
  'granite': ({ u, v, n, seed, wear, fine }) => {
    const tuning = materialSurfaceTuning.granite
    const crystal = cell(u + fine * tuning.crystalShiftU, v - fine * tuning.crystalShiftV, n, seed, tuning.crystalFaceting)
    const facet = smooth(tuning.facetStart, tuning.facetEnd, crystal.edge)
    const mica = smooth(tuning.micaStart, tuning.micaEnd, crystal.tone)
    const exposure = tuning.crystalBaseExposure + wear * tuning.crystalWearExposure
    return [
      tuning.baseHeight + facet * (tuning.facetBaseHeight + tuning.facetToneHeight * crystal.tone) * exposure + fine * tuning.fineRelief,
      tuning.baseTone + tuning.crystalTone * crystal.tone,
      mica * (tuning.micaAccent + tuning.micaWearAccent * wear),
    ]
  },
  'slate': (p) => strata(p, true),
  'sandstone': (p) => strata(p, false),
  'fresh-cut-timber': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = materialSurfaceTuning.freshCutTimber
    const grain = wave(u * n + valueNoise(u, v, tuning.grainWarpCellsU, seed, tuning.grainWarpCellsV) * tuning.grainBend)
    const knotU = fraction(u + tuning.knotOffsetU) - tuning.knotCenter
    const knotV = fraction(v + tuning.knotOffsetV) - tuning.knotCenter
    const knotRadius = Math.hypot(knotU, knotV * tuning.knotAspectRatio)
    const knot = 1 - smooth(tuning.knotCoreRadius, tuning.knotInfluenceRadius, knotRadius)
    const rings = blend(grain, wave(knotRadius * tuning.knotRingFrequency + patch), knot)
    const saw = wave(v * n + patch * tuning.sawPitchVariation) ** tuning.sawSharpness
    return [
      rings * tuning.ringHeight + saw * wear * tuning.sawHeight + fine * tuning.fineRelief,
      tuning.baseTone + rings * tuning.ringTone - knot * tuning.knotDarkening,
      saw * wear * tuning.sawAccent,
    ]
  },
  'weathered-board': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = materialSurfaceTuning.weatheredBoard
    const fiber = valueNoise(u, v, n, seed, tuning.fiberBands)
    const raised = wave(u * n + fiber * tuning.fiberRaisedPhase + patch * tuning.patchRaisedPhase) ** tuning.fiberSharpness
    const cracks = smooth(tuning.crackStart, tuning.crackEnd, fiber * tuning.crackFiberMix + patch * tuning.crackPatchMix + wear * tuning.crackWear)
    const salt = smooth(tuning.saltStart, tuning.saltEnd, patch * tuning.saltPatchMix + fiber * tuning.saltFiberMix + wear * tuning.saltWear)
    return [
      tuning.baseHeight + raised * (tuning.fiberBaseHeight + wear * tuning.fiberWearHeight) - cracks * tuning.crackDepth + fine * tuning.fineRelief,
      tuning.baseTone + raised * tuning.raisedTone + fiber * tuning.fiberTone,
      salt * (1 - cracks * tuning.crackSaltLoss),
    ]
  },
  'bark': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = materialSurfaceTuning.bark
    const warped = u + tuning.warpAmplitude * valueNoise(u, v, tuning.warpCellsU, seed, tuning.warpCellsV)
    const plate = cell(warped, v, n, seed + tuning.plateSeedOffset, tuning.plateFaceting)
    const ridge = wave(warped * n + valueNoise(u, v, n, seed + tuning.ridgeSeedOffset, tuning.ridgeBands) * tuning.ridgeBend)
    const patchShift = (patch - tuning.patchMidpoint) * tuning.fissurePatchShift
    const fissure = smooth(tuning.fissureStart + wear * tuning.fissureWear, tuning.fissureEnd, ridge + patchShift)
    const height = fissure * (tuning.fissureBaseHeight + smooth(tuning.plateLipStart, tuning.plateLipEnd, plate.edge) * tuning.plateLipHeight)
    return [
      height + fine * tuning.fineRelief,
      tuning.baseTone + height * tuning.heightTone + fine * tuning.fineTone,
      smooth(tuning.accentStart, tuning.accentEnd, height) * tuning.accentStrength,
    ]
  },
  'broadleaf': ({ u, v, n, seed, wear, fine }) => {
    const tuning = materialSurfaceTuning.broadleaf
    const leaf = cell(u, v, n, seed)
    const angle = leaf.tone * tuning.orientationSpan
    const along = leaf.dx * Math.cos(angle) + leaf.dy * Math.sin(angle)
    const across = leaf.dy * Math.cos(angle) - leaf.dx * Math.sin(angle)
    const edge = (1 - smooth(tuning.bladeCoreLength, tuning.bladeOuterLength, Math.abs(along))) * tuning.bladeHalfWidth - Math.abs(across)
    const blade = smooth(-tuning.outsideBladeLip, tuning.insideBladeLip, edge)
    const vein = (1 - smooth(tuning.midribCoreWidth, tuning.midribOuterWidth, Math.abs(across))) * tuning.midribRelief
      + wave((along - Math.abs(across) * tuning.veinSlope) * tuning.veinFrequency) ** tuning.veinSharpness * tuning.veinRelief
    const curl = smooth(-tuning.curlOutsideStart, tuning.curlOutsideEnd, edge) * (1 - smooth(tuning.curlInsideStart, tuning.curlInsideEnd, edge)) * wear
    return [
      blade * (tuning.bladeBaseHeight + vein * tuning.veinHeight + fine * tuning.fineRelief) + curl * tuning.curlHeight,
      tuning.baseTone + blade * (tuning.bladeBaseTone + tuning.leafTone * leaf.tone),
      blade * vein * tuning.veinAccent + curl * tuning.curlAccent,
    ]
  },
  'needles': ({ u, v, n, seed, wear, fine }) => {
    const tuning = materialSurfaceTuning.needles
    const spray = needleScatter(u, v, n, seed, true)
    return [
      spray.height - spray.tips * wear * tuning.tipWear + fine * tuning.fineRelief,
      tuning.baseTone + spray.height * tuning.sprayTone,
      spray.tips * wear,
    ]
  },
  'reed-blades': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = materialSurfaceTuning.reedBlades
    const blade = fraction(u * n + patch * tuning.patchPhase + wave(v) * tuning.swayPhase)
    const fold = smooth(tuning.foldStart, tuning.foldRise, blade) * (1 - smooth(tuning.foldFall, tuning.foldEnd, blade))
    const splitNoise = valueNoise(u, v, n, seed, tuning.splitNoiseBands)
    const split = smooth(tuning.splitStart - tuning.splitWear * wear, tuning.splitEnd, splitNoise) * wave(blade * tuning.splitHarmonic)
    const height = fold * (1 - tuning.splitDepth * split) + fine * tuning.fineRelief
    return [height, tuning.baseTone + fold * tuning.foldTone, split * tuning.splitAccent]
  },
  'brass': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = materialSurfaceTuning.brass
    const hammer = cell(u, v, n, seed)
    const dimple = (1 - smooth(tuning.dimpleCoreRadius, tuning.dimpleOuterRadius, hammer.distance)) * tuning.dimpleRelief
    const tarnishMix = patch * tuning.tarnishPatchMix + dimple * tuning.tarnishDimpleMix + wear * tuning.tarnishWear
    const tarnish = smooth(tuning.tarnishStart, tuning.tarnishEnd, tarnishMix)
    return [
      tuning.baseHeight - dimple * (1 - tarnish * tuning.tarnishDimpleFill) + fine * (tuning.fineRelief + tarnish * tuning.tarnishFineRelief),
      tuning.baseTone + tuning.fineTone * fine - dimple * tuning.dimpleDarkening,
      tarnish * tuning.tarnishAccent,
    ]
  },
  'steel': ({ u, v, n, seed, wear, fine }) => {
    const tuning = materialSurfaceTuning.steel
    const brush = valueNoise(u, v, n, seed, tuning.brushBands)
    const scratch = wave(u * tuning.scratchFrequencyU + v * tuning.scratchFrequencyV + brush) ** tuning.scratchSharpness * wear
    return [
      tuning.baseHeight + brush * tuning.brushRelief - scratch * tuning.scratchDepth + fine * tuning.fineRelief,
      tuning.baseTone + brush * tuning.brushTone,
      scratch * tuning.scratchAccent,
    ]
  },
  'copper': ({ u, v, n, seed, wear, patch, fine }) => {
    const tuning = materialSurfaceTuning.copper
    const pit = cell(u, v, n, seed)
    const stain = smooth(tuning.patinaStart, tuning.patinaEnd, patch * tuning.patinaPatchMix + fine * tuning.patinaFineMix + tuning.patinaWear * wear)
    const pore = (1 - smooth(tuning.poreCoreRadius, tuning.poreOuterRadius, pit.distance)) * (tuning.poreBaseDepth + tuning.poreToneDepth * pit.tone)
    return [
      tuning.baseHeight - pore * tuning.poreDepth + stain * (tuning.patinaBaseHeight + fine * tuning.patinaFineRelief),
      tuning.baseTone + tuning.fineTone * fine,
      stain,
    ]
  },
  'canvas': ({ u, v, n, wear, fine }) => {
    const tuning = materialSurfaceTuning.canvas
    const warp = wave(u * n), weft = wave(v * n)
    const over = wave((u + v) * n / tuning.overUnderPeriod)
    const fray = wear * smooth(tuning.frayStart, tuning.frayEnd, fine) * (1 - Math.max(warp, weft))
    const yarn = blend(warp ** tuning.yarnRoundness, weft ** tuning.yarnRoundness, over)
    const tone = tuning.baseTone + yarn * tuning.yarnTone + fine * tuning.fineTone
    return [yarn * tuning.yarnHeight + fray * tuning.frayHeight, tone, fray * tuning.frayAccent]
  },
  'wool': ({ u, v, n, seed, wear, fine }) => {
    const tuning = materialSurfaceTuning.wool
    const loop = cell(u, v, n, seed)
    const ring = 1 - smooth(tuning.loopCoreWidth, tuning.loopOuterWidth, Math.abs(loop.distance - tuning.loopRadius))
    const pillTone = loop.tone + wear * tuning.pillWear
    const pill = (1 - smooth(tuning.pillCoreRadius, tuning.pillOuterRadius, loop.distance))
      * smooth(tuning.pillToneStart, tuning.pillToneEnd, pillTone)
    const fleece = valueNoise(u, v, n * tuning.fleeceFrequency, seed + tuning.fleeceSeedOffset)
    return [
      tuning.baseHeight + tuning.ringHeight * ring + pill * tuning.pillHeight + fleece * tuning.fleeceHeight,
      tuning.baseTone + ring * tuning.ringTone + fine * tuning.fineTone,
      pill * tuning.pillAccent,
    ]
  },
  'workwear-twill': ({ u, v, n, wear, patch, fine }) => {
    const tuning = materialSurfaceTuning.workwearTwill
    const warp = wave(u * n)
    const weft = wave(v * n)
    const diagonal = wave((v - u) * n / tuning.diagonalPeriod)
    const diagonalCoverage = smooth(tuning.ribStart, tuning.ribEnd, diagonal)
    const rib = blend(warp, weft * tuning.weftRelief, diagonalCoverage) * (tuning.ribBaseHeight + tuning.diagonalHeight * diagonal)
    const worn = smooth(tuning.wornStart, tuning.wornEnd, patch + tuning.patchWear * wear) * wear
    return [
      rib * (1 - worn * tuning.wornDepth) + tuning.fineRelief * fine,
      tuning.baseTone + rib * tuning.ribTone,
      worn * (1 - rib * tuning.ribAccentMask) * tuning.wornAccent,
    ]
  },
}

const patterns = { ...standardPatterns, ...gameplayPatterns }

export function sampleSurface(recipe: SurfaceRecipe, settings: SurfaceSettings) {
  const tuning = groundSurfaceTuning.sharedNoise
  const pattern = patterns[recipe.id]
  const wear = settings.wear ?? recipe.wear.amount
  const { seed, spacing: { cells: n } } = recipe
  return (u: number, v: number) => pattern({
    u,
    v,
    n,
    seed,
    wear,
    patch: valueNoise(u, v, tuning.patchCells, seed + tuning.patchSeedOffset),
    fine: valueNoise(u, v, tuning.fineCells, seed + tuning.fineSeedOffset),
  })
}

export function meadowGroundTone(x: number, z: number, wear: number) {
  const tuning = groundSurfaceTuning.meadowGround
  // World-space fields with no wrap, at hillside, tussock patch and verge scales.
  const wide = valueNoise(x / tuning.hillsideScale, z / tuning.hillsideScale, 1, tuning.hillsideSeed, 1, false)
  const warp = valueNoise(x / tuning.warpScale, z / tuning.warpScale, 1, tuning.warpSeed, 1, false) * tuning.warpAmplitude
  const patch = valueNoise((x + warp) / tuning.tussockScale, (z - warp) / tuning.tussockScale, 1, tuning.tussockSeed, 1, false)
  const verge = valueNoise(x / tuning.vergeScale, z / tuning.vergeScale, 1, tuning.vergeSeed, 1, false)
  const field = wide * tuning.hillsideTone + patch * tuning.tussockTone + verge * tuning.vergeTone + (wear - tuning.wearMidpoint) * tuning.wearShift
  return smooth(tuning.toneStart, tuning.toneEnd, field)
}
