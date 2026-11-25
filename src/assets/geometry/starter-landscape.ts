export const starterShoreFinish = {
  sand: { repeatsPerMetre: 1.45 },
  wetSandTint: { redLoss: 0.33, greenLoss: 0.25, blueGain: 0.05 },
  rock: { repeatsPerMetre: 0.67, cos: 0.89, sin: 0.456, red: 0.62, green: 0.69, blue: 0.88 },
  // Upland rock is granite: sandstone on the low coast gives way to it with height. Its look is `highwoodGranite`.
  granite: { heightStart: 7, heightFull: 15 },
  // Stone is projected from three sides, so steep faces aren't streaked; higher sharpness narrows the blend.
  triplanar: { sharpness: 4 },
  shellglass: {
    toneRadiusX: 4.2,
    toneRadiusZ: 3.5,
    falloffPower: 3,
    seam: { base: 0.86, amplitude: 0.14, xFrequency: 3.2, zFrequency: 2.1 },
    redLoss: 0.60,
    greenLoss: 0.39,
    blueLoss: 0.36,
  },
} as const

export const starterMeadowFinish = {
  falloffPower: 1.4,
  duff: { reach: 10, greenLoss: 0.48, blueLoss: 0.44 },
  woodland: { reach: 50, redLoss: 0.42, greenLoss: 0.27, blueLoss: 0.12 },
  exposedRidge: { reach: 41, redGain: 0.44, greenLoss: 0.30, blueLoss: 0.32 },
  wetland: { reach: 31, blueGain: 0.19 },
  streamBank: { endZ: 94, endBlend: 2, reach: 1.6, sideBlend: 1.5, redGain: 0.13, greenLoss: 0.29, blueGain: 0.16 },
  dryGrass: { redGain: 0.22, greenLoss: 0.20, blueLoss: 0.39 },
  greenGrass: { redLoss: 0.08, greenGain: 0.17 },
} as const

// Highwood's generated ground. Steep ground shows bare stone (`cover` of the beach
// shader's stone texture); the tints over the turf are red, green and blue
// multipliers, kept gentle so turf never turns to clay: high ground leans to
// heath, wet hollows where water gathers stay green, and slopes differ by aspect.
// Highwood's ground cover over the turf, weighted by the baked habitat raster:
// pine needle litter as the pine-duff texture, and tints (red, green, blue
// multipliers) for heather, moss and bracken. `strength` is the most each takes over.
export const highwoodGroundCover = {
  // Needles are 48 mm in the pine-duff recipe: about 2.6 tiles per metre shows them at
  // true size. A second, coarser sample turned against the first hides the repeat; its share follows `groundVariation.litterBreakup`.
  litter: { repeatsPerMetre: 2.6, breakupRepeatsPerMetre: 0.37, strength: 0.85, tint: [0.95, 0.9, 0.82] },
  heath: { strength: 0.7, tint: [0.96, 0.8, 0.84] },
  moss: { strength: 0.7, tint: [0.72, 1.02, 0.7] },
  bracken: { strength: 0.65, tint: [1.12, 0.94, 0.66] },
} as const

// Variation shared by every layer of the ground (beach-material.ts), at three
// wavelengths in metres: broad patches, mid clumps and fine mottling. Natural ground
// varies at every scale, so no single tile or blend reads as a pattern.
export const groundVariation = {
  broadM: 29,
  midM: 5.3,
  fineM: 1.15,
  // Brightness swing of turf and cover at each scale, as a share of the albedo.
  tone: { broad: 0.11, mid: 0.07, fine: 0.05 },
  // Broad patches lean warm (drier) or cool (damper): red, green, blue gain at full warmth.
  warmth: [0.05, 0.015, -0.06],
  // Each cover layer's weight is scaled by 1 ± `coverPatch`, so litter, heath, moss and
  // bracken lie in ragged clumps instead of smooth 4 m vertex blends. Zero cover stays zero.
  coverPatch: 0.85,
  // Litter's coarse breakup sample takes between these shares, by the mid noise.
  litterBreakup: [0.1, 0.6],
  // How far the mid and fine noise push bare rock's weight midway through its blend,
  // so outcrops break into the turf as patches while full rock and no rock stay put.
  rockJitter: 0.85,
  // Metres from the eye where fine detail, then relief, fade to their average; past
  // them the clasts and bumps would shimmer and cost time for nothing.
  detailFade: [18, 48],
  fineFade: [60, 140],
  reliefFade: [14, 42],
} as const

// Highwood's bare ground is granite (see docs/field-guide/places/granite-uplands.md).
// The steepest ground is jointed bedrock; gentler rocky ground is grus, the loose
// gravel granite weathers into. Sizes are metres; relief values are slope (rise per
// metre) at full strength; tints are red, green, blue multipliers.
export const highwoodGranite = {
  // Crystals at true size, about 16 mm: the recipe tile is 24 crystals of 8 mm (0.19 m), shown at twice size.
  crystalRepeatsPerMetre: 2.6,
  // The recipe's middle colour in linear light, the mean the crystals calm toward on bedrock.
  crystalMean: [0.43, 0.4, 0.38],
  // Weathered granite leans warm and buff, beside the island's olive turf.
  tint: [0.8, 0.77, 0.72],
  // Rock weight (shoreCover.y, from slope) where grus gives way to bedrock, jittered by the mid noise.
  bedrockFrom: 0.5,
  bedrockFull: 0.8,
  bedrockJitter: 0.35,
  // Joint blocks: long joints run along Cairn Summit's granite core (its bearing comes from the core),
  // cross joints between them; both wander up to `wanderM` either way. `closedCrossShare`
  // of cross joints stay shut. `roughM` is the wavelength of the faces' own roughness.
  // A block's tone, tilt and lichen change sharply only behind an open crack. Across a closed
  // cross joint they ramp from one block to the next; within `featherM` of a closed sheet
  // joint they fade to a shared smooth field. A sheet joint opens or closes block by block
  // along its length, easing over `jointEndShare` of a block at each end so cracks thin out;
  // an open one is `sheetOpenMin` to `sheetOpenMax` of a full crack wide. A cross crack thins out over
  // `crackTaperM` where it meets a shut sheet joint. Shade and relief fade with the opening.
  blocks: {
    featherM: 0.45,
    jointEndShare: 0.12,
    sheetOpenMin: 0.6,
    sheetOpenMax: 1.4,
    crackTaperM: 0.15,
    sheetSpacingM: 1.4,
    crossSpacingM: 2.6,
    wanderM: 1.5,
    spacingJitter: 0.35,
    closedSheetShare: 0.3,
    closedCrossShare: 0.7,
    skewDeg: 25,
    jointWidthM: 0.12,
    jointShade: 0.42,
    toneSpread: 0.12,
    tilt: 0.5,
    jointRelief: 1.4,
    // Share of the crystal speckle kept on bedrock faces.
    crystalContrast: 0.7,
    roughM: 0.38,
    roughTone: 0.22,
    roughRelief: 0.2,
  },
  // Grus clasts: `stoneRadius` is the share of a cell a clast fills; the rest is gritty sand.
  grus: { sizeM: 0.16, stoneRadius: 0.38, sizeSpread: 0.6, coverFrom: 0.25, coverFull: 0.5, stoneEdge: 0.12, toneSpread: 0.32, domeRelief: 1.1, sand: [0.86, 0.78, 0.66] },
  // Lichen crusts patch the exposed rock grey-green; `cover` is the most they take over.
  lichen: { start: 0.5, full: 0.75, cover: 0.65, tint: [0.8, 0.88, 0.64] },
  // Dark weathering blotches; `cover` is the most they darken.
  stain: { start: 0.55, full: 0.85, cover: 0.6, tint: [0.62, 0.6, 0.56] },
  // Brightness swing by the broad and mid noise, and the height in metres of the bumps
  // they add (the slope is that height over the noise's wavelength).
  tone: { broad: 0.24, mid: 0.16 },
  relief: { broad: 1.6, mid: 0.55 },
  // Hollows darken: albedo at the bottom of a joint or between clasts.
  cavity: 0.75,
} as const

export const highwoodGroundFinish = {
  rock: { slopeStart: 0.55, slopeFull: 1.0, cover: 0.9 },
  heath: { heightStart: 16, heightFull: 40, tint: [1.07, 0.92, 0.97] },
  // Aspect: sun-facing south slopes dry to straw, shaded north slopes stay cool
  // and mossy, at full strength once a slope rises `slopeFull` per metre.
  aspect: { slopeStart: 0.08, slopeFull: 0.5, sunny: [1.08, 1.0, 0.84], shaded: [0.84, 0.97, 1.02] },
  wet: { tint: [0.82, 1.1, 0.9] },
  dry: { heightStart: 4, heightFull: 12, tint: [1.1, 1.0, 0.82] },
} as const

export const starterOcean = {
  halfExtent: 1800,
  triangles: [0, 1, 2, 0, 2, 3],
} as const

export const fernfallSheet = {
  color: '#e2f3ea',
  opacity: 0.9,
  ripple: { amplitude: 0.014, laneFrequency: 5, streamFrequency: 2 },
  froth: {
    gradientSample: 0.1,
    gradientGain: 8,
    base: 0.42,
    amplitude: 0.34,
    laneFrequency: 15,
    streamFrequency: 1.8,
    red: { base: 0.39, gain: 0.74 },
    green: { base: 0.66, gain: 0.37 },
    blue: { base: 0.65, gain: 0.43 },
  },
  fade: { outletLength: 2.8, edgeStrength: 0.55, edgePower: 5 },
} as const

// Highwood's terrain tiles: a whole number of cells per tile, so neighbouring tiles share their edge vertices. Cells are a
// metre, on the height bake's own grid from its origin, so every other vertex is a bake node and
// the drawn ground follows the ground players stand on; at 1.5 m off that grid it rose up to 0.8 m
// above their feet in creases. Beyond `farTerrainM` a tile draws every `farStride`th vertex.
export const terrainTile = { tileMetres: 64, cellM: 1, farStride: 2, farTerrainM: 160 } as const
