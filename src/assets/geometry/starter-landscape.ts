export const starterShoreFinish = {
  uvRepeatsPerTurn: 96,
  uvRadialScale: 32,
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

export const starterOcean = {
  halfExtent: 850,
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
