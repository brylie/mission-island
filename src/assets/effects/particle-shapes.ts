export const fiberShapes = {
  parachute: {
    crown: { rise: 0.47, curvature: 0.5, falloff: 7 },
    spokes: { originV: 0.48, count: 27, sharpness: 6, baseOpacity: 0.32, opacityVariation: 0.68 },
    tuft: { halfWidth: 0.85, edgeFalloff: 17 },
    stem: { startV: -0.43, endV: 0.62, edgeFalloff: 15, opacity: 0.73 },
    seed: { centerV: 0.65, uScale: 10, vScale: 5.8, darkensAtV: 0.46, shade: 185 },
    shade: 248,
  },
  feather: {
    bend: { amount: 0.22, offsetV: 0.5, frequency: 2.5 },
    vane: { halfWidth: 0.54, taperPower: 1.55, tipTaper: 0.28, edgeFalloff: 13 },
    barbs: { baseOpacity: 0.63, opacityVariation: 0.37, frequencyV: 31, slant: 13 },
    quill: { halfLength: 0.95, lateralFalloff: 18, endFalloff: 10, stripeHalfWidth: 0.05, shade: 181 },
    shade: 247,
  },
} as const

export const wetShapes = {
  foam: { radius: 0.88, edgeWobble: 0.15, edgeFalloff: 6, baseOpacity: 0.48, opacityVariation: 0.49, shade: 251 },
  ring: { band: { radius: 0.73, falloff: 13 }, baseOpacity: 0.76, opacityVariation: 0.24 },
  crescent: { band: { radius: 0.71, falloff: 14 }, maskOffsetV: 0.11, maskFalloff: 2.45, shade: 251 },
  bubble: {
    band: { radius: 0.72, falloff: 11 },
    rimOpacity: 0.74,
    glint: { centerU: -0.33, centerV: -0.44, falloff: 5.2 },
    shade: 254,
  },
  bead: {
    band: { radius: 0.65, falloff: 10 },
    rimOpacity: 0.56,
    glint: { centerU: -0.24, centerV: -0.35, falloff: 4.2 },
    core: { radius: 0.68, opacity: 0.43 },
    shade: 252,
  },
} as const

export const wingedShapes = {
  body: { uScale: 4.4, vScale: 1.46, shadeThreshold: 0.38 },
  wing: { centerU: 0.47, slant: 0.33, scale: 2.38, featherPower: 1.3, shade: 252 },
  bee: { wingOpacity: 0.64, stripeBaseShade: 142, stripeShadeVariation: 106, stripeFrequency: 8 },
  moth: { wingOpacity: 0.91, bodyShade: 224 },
} as const

export const soleShape = {
  toe: { radius: 0.89, uScale: 1.07, centerV: 0.27, vScale: 1.45, falloff: 5 },
  heel: { radius: 0.57, uScale: 1.44, centerV: -0.49, vScale: 1.56, falloff: 6 },
  tread: { frequencyV: 24, curveU: 4, baseOpacity: 0.62, opacityVariation: 0.38 },
} as const

export const textureWobble = { sineU: 14, sineV: 7, cosineU: 9, cosineV: 13 } as const

export const particleShapes = {
  flame: { bend: 0.11, bendFrequency: 5, width: 1.3, tipTaper: 0.45, edgeWobble: 0.085 },
  smoke: { edgeWobble: 0.16 },
  leaf: {
    radius: 0.88,
    tipPower: 1.35,
    edgeFalloff: 16,
    vein: { halfWidth: 0.065, shade: 165 },
    blade: { baseShade: 218, shadeVariation: 33, frequencyU: 3, frequencyV: 8 },
  },
  drop: {
    radius: 0.91,
    taper: 0.36,
    edgeFalloff: 6,
    baseShade: 215,
    glint: { centerU: -0.25, centerV: 0.18, falloff: 2, shadeVariation: 40 },
  },
  streak: { lengthFalloffPower: 0.65 },
  mote: { radialFalloffPower: 0.8 },
  petal: { curl: 0.18, curlFrequency: 4, radius: 0.79, width: 1.4, tipTaper: 0.37, edgeFalloff: 12, baseShade: 229, shadeVariation: 26 },
  clod: { radius: 0.8, vScale: 1.21, diagonalScale: 0.82, edgeWobble: 0.1, edgeFalloff: 11, baseShade: 220, shadeVariation: 31 },
} as const
