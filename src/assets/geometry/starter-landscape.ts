export const starterShoreFinish = {
  sand: { repeatsPerMetre: 1.45 },
  wetSandTint: { redLoss: 0.33, greenLoss: 0.25, blueGain: 0.05 },
  rock: { repeatsPerMetre: 0.67, cos: 0.89, sin: 0.456, red: 0.62, green: 0.69, blue: 0.88 },
  // Upland rock is granite: sandstone on the low coast gives way to it with height.
  granite: { repeatsPerMetre: 0.45, heightStart: 7, heightFull: 15, red: 0.86, green: 0.89, blue: 0.95 },
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
