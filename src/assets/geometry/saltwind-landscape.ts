export const saltwindLandscapePalette = {
  sea: [49, 117, 133],
  shoal: [101, 170, 162],
  yard: [186, 166, 129],
} as const

export const terrainFinish = {
  noise: {
    base: 0.97,
    ripple: { amplitude: 0.027, xFrequency: 0.09, zFrequency: 0.07 },
    grain: { amplitude: 0.019, xFrequency: 0.12, zFrequency: 0.14 },
  },
  yard: { edgeOffset: 1, blendWidth: 6, opacity: 0.72 },
  tarnstepBank: { maxZ: 200, zBlend: 5, extension: 10, sideBlend: 6 },
  picnicShelf: { radiusX: 9, radiusZ: 5, centerOffsetZ: -3 },
  slate: { color: [125, 133, 125], base: 0.93, amplitude: 0.07, yFrequency: 2.1, xFrequency: 0.11 },
  sand: { uvScale: 3.5, uvSkew: 0.72 },
} as const

export const waterSurface = {
  sound: { halfExtent: 1600, surfaceDrop: 0.005, triangles: [0, 1, 2, 0, 2, 3] },
  river: { surfaceDrop: 0.009, color: '#6ba9ad' },
  tarnstep: { cutBankOverlap: 0.85 },
} as const

const railPaint = '#e7d6b2'
const railWidth = 0.22

export const saltwindRoads = {
  boardColor: '#ae987b',
  roadColor: '#69716b',
  centreLine: { centreY: 0.036, size: [0.14, 0.014, 2.35], color: '#e6d9aa' },
  rails: {
    edgeInset: 0.24,
    endInset: 0.24,
    post: { centreY: 0.38, size: [railWidth, 0.80, railWidth], color: railPaint },
    support: { width: 0.76, depth: 0.88, foundation: 0.28, color: '#93968a' },
    beamWidth: railWidth,
    beams: [
      { height: 0.13, centreY: 0.65, color: railPaint },
      { height: 0.36, centreY: -0.17, color: '#878277' },
    ],
  },
} as const

export const airstripMarkings = {
  pavement: { thickness: 0.09, apronColor: '#777d72', runwayColor: '#646b65' },
  edges: { trimLength: 4, inset: 0.78, centreY: 0.077, height: 0.011, depth: 0.20, color: '#f7e3bc' },
  threshold: { inset: 8, centreY: 0.079, offsets: [-3, -2, -1, 0, 1, 2, 3], spacing: 1.65, size: [7.6, 0.012, 0.41], color: '#faf0ce' },
  centreLine: { countPerSide: 7, spacing: 24, centreY: 0.078, size: [10, 0.013, 0.24], color: '#fff1c4' },
} as const

export const windsock = {
  pole: { centreY: 3.05, topDiameter: 0.13, bottomDiameter: 0.19, height: 6.1, sides: 9, color: '#805d48' },
  fabric: { x: 1.10, y: 5.89, size: [2.35, 0.51, 0.55], color: '#dc774f' },
  bands: { x: [0.53, 1.56], topY: 6.05, size: [0.29, 0.53, 0.57], color: '#f1ddae' },
  droop: 0.19,
} as const

export const saltwindWalkFinish = {
  trailWidth: 1.25,
  frontWalk: { width: 1.45, lift: 0.045, concrete: '#c1bbab' },
} as const
