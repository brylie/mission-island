type Box = readonly [x: number, y: number, z: number, width: number, height: number, depth: number]
type Ellipsoid = readonly [x: number, y: number, z: number, diameterX: number, diameterY: number, diameterZ: number]
type Cylinder = readonly [
  x: number,
  y: number,
  z: number,
  topDiameter: number,
  bottomDiameter: number,
  height: number,
  sides: number,
]

export const brakeChipRoad = {
  box: [0, -0.047, 0, 4.9, 0.092, 8.8] satisfies Box,
  color: '#9d9079',
} as const

export const grainSpillSet = {
  sack: {
    belly: { ellipsoid: [0, 0.274, 0, 0.64, 0.73, 0.49] satisfies Ellipsoid, segments: 8, color: '#b89e73' },
    neck: { cylinder: [0, 0.598, 0, 0.256, 0.37, 0.134, 9] satisfies Cylinder, color: '#b29a70' },
    mouth: { cylinder: [0, 0.672, 0, 0.186, 0.185, 0.017, 8] satisfies Cylinder, color: '#826740' },
    outletHeightM: 0.66,
  },
  floor: { box: [0, -0.041, -1.36, 4.65, 0.082, 3.35] satisfies Box, color: '#7c7664' },
} as const

const hoistZM = -0.24

export const hoistRig = {
  liftZM: hoistZM,
  posts: { x: [-1.65, 1.65], y: 1.38, size: [0.18, 2.76, 0.2], color: '#727d78' },
  beam: { box: [0, 2.76, hoistZM, 3.52, 0.17, 0.265] satisfies Box, color: '#89948c' },
  hook: {
    shaft: { cylinder: [0, 0.03, 0, 0.055, 0.061, 0.13, 8] satisfies Cylinder, color: '#7f8580' },
    jaw: { box: [0.047, -0.02, 0, 0.143, 0.048, 0.062] satisfies Box, tiltRad: 0.28, color: '#737b78' },
    offsetAboveCrateM: 0.066,
  },
  chain: {
    count: 15,
    anchorYM: 2.68,
    alongBeam: [0.091, 0.118, 0.064],
    acrossBeam: [0.068, 0.118, 0.09],
    color: '#737d78',
    minimumHeightM: 0.041,
    overlapM: 0.009,
  },
} as const

export const washStation = {
  basin: {
    floor: [0, 0.78, 0, 1.86, 0.153, 0.97] satisfies Box,
    corners: { x: [-0.86, 0.86], y: 0.846, z: [-0.47, 0.47], size: [0.086, 0.194, 0.077] },
    rims: { y: 0.883, z: [-0.437, 0.437], size: [1.84, 0.12, 0.082] },
    color: '#718a87',
  },
  supports: { y: 0.351, z: 0.09, size: [0.125, 0.702, 0.36], color: '#696f65' },
  water: { box: [0, 0.875, 0, 1.62, 0.037, 0.78] satisfies Box, color: '#548883' },
  produce: {
    count: 5,
    firstXM: 0.39,
    spacingXM: 0.165,
    heightM: 0.923,
    centerZM: 0.057,
    staggerM: 0.123,
    staggerPhaseStepRad: 3,
    pitchRad: -0.26,
    headingStepRad: 1.7,
    rollRad: -0.17,
  },
} as const

const chalkLineZM = 0.16

export const chalkDeck = {
  planks: { count: 11, y: -0.045, spacingM: 0.29, size: [4.3, 0.09, 0.278], color: '#8d725a' },
  line: {
    z: chalkLineZM,
    cord: { sections: 14, spanM: 2.96, size: [0.22, 0.022, 0.021], color: '#85b3be' },
    mark: { box: [0, 0.008, chalkLineZM, 2.95, 0.005, 0.027] satisfies Box, color: '#729eac' },
  },
} as const
