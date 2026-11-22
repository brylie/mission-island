type LegSection = readonly [y: number, z: number, halfWidth: number, halfDepth: number]
type CuffSection = readonly [aboveHem: number, z: number, extraHalfWidth: number, halfDepth: number, finish?: 'trim']

export const legInset = 0.032

const petalOutline: number[][] = [[0, 0.5], [-0.36, 0.25], [-0.5, -0.05], [-0.31, -0.39], [0, -0.5], [0.32, -0.34], [0.48, 0.04], [0.31, 0.34]]
const pocketOutline: number[][] = [[-0.48, 0.50], [0.48, 0.50], [0.46, -0.26], [0.28, -0.48], [-0.34, -0.48], [-0.46, -0.32]]
const bellowsFlapOutline: number[][] = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.15], [0, -0.5], [-0.5, -0.15]]
const signalFlagOutline: number[][] = [[-0.45, 0.48], [0.50, 0.40], [0.42, -0.45], [-0.48, -0.47]]
const saltCrystalOutline: number[][] = [[0, 0.5], [-0.43, -0.06], [0, -0.5], [0.43, -0.06]]
const clawOutline: number[][] = [[0, -0.5], [-0.44, -0.17], [-0.48, 0.5], [-0.03, 0.15], [0.27, 0.48], [0.44, 0.03]]

export const trouserCuts = {
  hemHeight: { long: -0.463, short: -0.261, saltShorts: -0.208 },
  ankleWidth: { regular: 0.106, short: 0.120, wide: 0.144 },
  ankleOverrides: { 'night-flares': 0.161, 'oat-culottes': 0.148, 'plum-pleats': 0.123 },
  cuff: [
    [0, 0.003, 0, 0.124, 'trim'],
    [0.008, 0.003, 0.006, 0.131, 'trim'],
    [0.034, 0.002, 0.007, 0.132, 'trim'],
    [0.039, 0.001, 0.007, 0.133],
  ] satisfies readonly CuffSection[],
  calf: [
    { y: -0.370, z: -0.003, regular: [0.116, 0.125], cloud: [0.142, 0.143] },
    { y: -0.306, z: 0.002, regular: [0.120, 0.130], cloud: [0.151, 0.150] },
  ],
  knee: { y: -0.147, z: 0.009, regularWidth: 0.133, wideWidth: 0.141, depth: 0.146 },
  thigh: { y: -0.057, z: 0.006, width: 0.139, depth: 0.152 },
  rise: [
    { y: 0.055, inset: 0.043, z: -0.003, width: 0.133, depth: 0.141 },
    { y: 0.093, inset: 0.050, z: -0.012, width: 0.117, depth: 0.119 },
  ],
} as const

export const trouserTrim = {
  bellows: {
    sideX: 0.14,
    pocket: { outline: pocketOutline, y: -0.165, centerZ: 0.004, width: 0.148, height: 0.131 },
    flap: { outline: bellowsFlapOutline, y: -0.119, centerZ: 0.005, width: 0.150, height: 0.045, clearance: 0.004 },
  },
  signalFlag: { outline: signalFlagOutline, y: -0.285, z: 0.136, width: 0.131, height: 0.132 },
  tideEmbroidery: {
    arcSamples: [-0.75, -0.43, 0, 0.46, 0.76],
    radiusX: 0.145,
    radiusZ: 0.144,
    centerZ: 0.003,
    aboveHem: 0.060,
    waveHeight: 0.008,
    waveStep: 1.8,
    thread: [0.003, 0.002],
    sides: 6,
  },
  cloudDetails: {
    tuck: {
      heights: [-0.378, -0.359],
      arcSamples: [-0.78, -0.45, 0, 0.45, 0.78],
      width: 0.130,
      lift: 0.016,
      z: 0.13,
      thread: [0.0028, 0.002],
      sides: 6,
    },
    label: { outline: pocketOutline, sideX: 0.143, y: -0.137, centerZ: 0.005, width: 0.085, height: 0.062 },
  },
  saltCrystals: {
    outline: saltCrystalOutline,
    z: 0.135,
    stitches: [{ outward: 0.046, y: -0.136, size: 0.044 }, { outward: 0.088, y: -0.102, size: 0.032 }],
  },
} as const

const bootCollar = [
  { bootY: -0.364, highTopY: -0.432, z: -0.003, width: 0.112, depth: 0.119 },
  { bootY: -0.356, highTopY: -0.424, z: -0.003, width: 0.117, depth: 0.125, finish: 'trim' },
  { bootY: -0.331, highTopY: -0.403, z: -0.003, width: 0.116, depth: 0.124, finish: 'trim' },
] satisfies readonly { bootY: number, highTopY: number, z: number, width: number, depth: number, finish?: 'trim' }[]

export const shoeCuts = {
  toeZ: { regular: 0.052, clog: 0.066 },
  sectionSides: 24,
  closedOpening: 0.054,
  sole: [
    { y: -0.680, width: 0.114, depth: 0.169 },
    { y: -0.673, width: 0.125, depth: 0.179 },
    { y: -0.652, width: 0.128, depth: 0.182 },
  ],
  welt: { y: -0.646, width: 0.128, depth: 0.182 },
  forefoot: [
    { y: -0.641, toeOffset: 0, width: 0.129, depth: 0.182 },
    { y: -0.600, toeOffset: 0.007, width: 0.129, depth: 0.185 },
  ],
  instep: [-0.570, 0.060, 0.121, 0.174] satisfies LegSection,
  highShaft: [[-0.535, 0.028, 0.115, 0.143], [-0.490, 0.004, 0.106, 0.119]] satisfies readonly LegSection[],
  bootCollar,
  lowCollar: {
    quarter: [-0.552, 0.032, 0.104, 0.136] satisfies LegSection,
    collar: [-0.542, 0.001, 0.086, 0.091] satisfies LegSection,
  },
} as const

export const shoeTrim = {
  sandal: {
    straps: [
      { z: 0.125, y: -0.635, width: 0.109, height: 0.055 },
      { z: -0.002, y: -0.632, width: 0.096, height: 0.076 },
    ],
    arcSamples: [-1, -0.82, -0.45, 0, 0.45, 0.82, 1],
    skew: 0.014,
    band: [0.020, 0.006],
    normal: [0, 1, 0.28],
    sides: 8,
    clasp: { outline: petalOutline, outward: 0.048, width: 0.050, y: -0.584, height: 0.008, z: 0.127, depth: 0.049 },
  },
  vampApplique: {
    wing: petalOutline,
    claw: clawOutline,
    outward: 0.047,
    width: 0.087,
    skew: 0.043,
    y: -0.560,
    z: 0.155,
    depth: 0.101,
    normal: [0, 1, 0.4],
    mothBody: { outline: petalOutline, width: 0.026, y: -0.56, z: 0.154, depth: 0.075 },
  },
  canvasLace: {
    eyes: [{ y: -0.533, z: 0.145 }, { y: -0.545, z: 0.165 }, { y: -0.562, z: 0.186 }],
    samples: [-1, -0.5, 0, 0.5, 1],
    width: 0.062,
    bow: 0.005,
    lift: 0.001,
    crossSection: [0.006, 0.004],
    normal: [0, 1, 0.2],
    sides: 6,
  },
  kelp: {
    coil: {
      segments: 15,
      phase: 0.5,
      angleDivisor: 8,
      radiusX: 0.118,
      radiusZ: 0.127,
      y: -0.467,
      climb: 0.082,
      z: -0.003,
      crossSection: [0.010, 0.006],
      sides: 8,
    },
    tab: { outline: petalOutline, outward: 0.115, y: -0.399, height: 0.110, z: 0.008, width: 0.041, skew: 0.025 },
  },
} as const
