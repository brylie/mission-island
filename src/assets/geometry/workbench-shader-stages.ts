export const studyQuadTriangles = [0, 1, 2, 0, 2, 3] as const

const groveGround = { surface: 'grass', color: '#568050', centreY: -0.062, size: [11, 0.11, 9] } as const
export const shaderStudioGround = {
  'canopy-dapple': groveGround,
  'meadow-pollen': groveGround,
  'closing-flowers': { surface: 'grass', color: '#6e8755', centreY: -0.059, size: [6, 0.11, 4.6] },
  'reed-transmission': { surface: 'grass', color: '#4b7060', centreY: -0.059, size: [6, 0.11, 4.6] },
  'sand-footprints': { surface: 'sand', color: '#bfac82', centreY: -0.063, size: [7, 0.12, 7] },
  'road-retroreflector': { surface: 'stone', color: '#74806f', centreY: -0.078, size: [7, 0.15, 4.6] },
} as const

export const shaderStudioGrove = {
  trees: [
    { x: -3, z: 2.7, height: 2.1 },
    { x: 3.5, z: 2.3, height: 2.4 },
    { x: -2.8, z: -1.8, height: 1.32 },
    { x: 1.6, z: 3.2, height: 1.57 },
  ],
  crown: { centreRatio: 0.62, widthRatio: 1.4, depthRatio: 0.99, shade: '#416249', daylight: '#39654e' },
  trunk: { centreRatio: 0.25, topDiameter: 0.12, bottomDiameter: 0.26, heightRatio: 0.5, sides: 6, color: '#6d5940' },
} as const

export const shaderStudioWater = {
  pond: { width: 12, depth: 12 },
  wake: { width: 28, depth: 17 },
  moon: { width: 23, depth: 29 },
  surfaceY: -0.022,
  clearWater: { color: '#77bde1', alpha: 0.28 },
  bed: { color: '#ae9f78', centreY: -0.52, thickness: 0.12 },
  stones: { count: 13, seed: 371, width: 6, depth: 4.8, size: 0.12, sizeVariation: 0.48, centreY: -0.39, height: 0.16, depthRatio: 0.7, color: '#848671' },
} as const

export const shaderStudioAnchors = {
  wader: { y: -0.34, heading: -0.18 },
  windowPaneY: 1.31,
  cascadeMistY: 1.65,
  ropeBase: { y: -0.12, topDiameter: 1.73, bottomDiameter: 1.78, height: 0.23, sides: 16, color: '#8c693d' },
  mooringPin: { y: 0.08, topDiameter: 0.15, bottomDiameter: 0.19, height: 0.21, sides: 10, color: '#685744' },
} as const

export const shaderStudioCascade = {
  bed: {
    color: '#668476',
    positions: [
      [-1.35, 3.22, -3.9],
      [1.35, 3.22, -3.9],
      [1.5, 2.51, -2.31],
      [-1.5, 2.51, -2.31],
      [-1.7, 0.31, 1.1],
      [1.69, 0.31, 1.1],
      [1.9, -0.02, 3.5],
      [-1.9, -0.02, 3.5],
    ],
    triangles: [0, 1, 2, 0, 2, 3, 3, 2, 5, 3, 5, 4, 4, 5, 6, 4, 6, 7],
    uvs: [[0, 0], [2, 0], [2, 0.8], [0, 0.8], [0, 2], [2, 2], [2, 3], [0, 3]],
  },
  boulders: {
    positions: [
      { x: -1.8, y: 0.21, z: 1.4, scale: 1.7 },
      { x: 1.4, y: 0.34, z: 1.6, scale: 2.1 },
      { x: -1.8, y: 0.68, z: -1, scale: 1.6 },
      { x: 1.5, y: 1.3, z: -2, scale: 1.8 },
      { x: -1.1, y: 2.45, z: -3.85, scale: 1.67 },
    ],
    spillSpread: 1.53,
    widthRatio: 1.58,
    heightRatio: 0.88,
    depthRatio: 1.25,
    color: '#879083',
  },
  plungePool: { centre: [0, -0.027, 1.45], size: [4.2, 0.046, 5.2], color: '#4b9a90' },
} as const

export const shellglassShaderSample = {
  width: 11,
  depth: 9,
  segments: 96,
  uvTile: 4.5,
  stones: {
    count: 19,
    seed: 63,
    width: 6.5,
    depth: 5.6,
    size: 0.12,
    sizeVariation: 0.29,
    lift: 0.027,
    heightRatio: 0.45,
    depthRatio: 0.82,
    colors: ['#cbbf9b', '#6a7c72'],
  },
} as const

export const meadowShaderSample = {
  width: 23,
  depth: 23,
  segments: 88,
  uvTile: 1,
  centreZ: -4,
  bladeFocus: { x: -4, z: -4, y: 0.23 },
  blades: {
    count: 370,
    seed: 881,
    scatterSeed: 226,
    width: 21,
    depth: 17,
    trailClearance: 1.02,
    focusOffsets: [{ x: 0.42, z: -0.31 }, { x: -0.4, z: 0.3 }],
  },
} as const

export const pavingShaderSample = {
  sidewalk: { name: 'Seabrook pavement sample', width: 3.2, points: [{ x: -4.5, z: 0 }, { x: 4.5, z: 0 }] },
  grass: { centreY: -0.1, size: [9, 0.2, 6.8] },
} as const

export const dawnMistShaderSample = {
  water: { centreY: 0.02, size: [23, 0.06, 19] },
  mistHeight: 0.04,
  rocks: {
    positions: [{ x: -9, z: 0, scale: 1 }, { x: -7, z: -6, scale: 1.65 }, { x: -3, z: 8, scale: 0.8 }, { x: 8, z: -5, scale: 0.55 }],
    centreY: 0.06,
    width: 3.4,
    height: 0.74,
    depth: 2.9,
    color: '#647c66',
  },
} as const
