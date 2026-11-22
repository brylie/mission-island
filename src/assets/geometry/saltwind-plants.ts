type Ellipsoid = readonly [
  x: number,
  y: number,
  z: number,
  diameterX: number,
  diameterY: number,
  diameterZ: number,
  color: string,
]

export const longAcreCropBed = { size: [86, 0.07, 1.47], color: '#b49165' } as const

const fieldLeaf = '#829154'
const seedHead = '#c1a662'
const seedHeadColors = [seedHead, seedHead] as const

export const saltwindPlantModels = {
  leafSegments: 5,
  trunk: {
    centerY: 1.55,
    width: 0.42,
    height: 3.7,
    depth: 0.39,
    color: '#8e6b4c',
    support: { belowGround: 0.3, aboveGround: 3.4 },
  },
  fir: {
    tierCount: 3,
    firstY: 2.55,
    tierRise: 1.09,
    tipDiameter: 0.36,
    firstBaseDiameter: 3.45,
    baseTaper: 0.61,
    tierHeight: 2.13,
    tierSides: 8,
    tierColors: ['#507a58', '#64875e'],
  },
  alder: [
    [0, 3.97, 0, 3.4, 3.14, 3.17, '#86a364'],
    [-0.91, 3.48, 0.3, 2.28, 2.42, 2.39, '#96aa66'],
  ] satisfies readonly Ellipsoid[],
  fern: {
    frondsPerSide: 3,
    firstX: 0.16,
    xSpacing: 0.14,
    firstY: 0.36,
    dropPerFrond: 0.045,
    layers: [{ z: -0.12, color: '#547d56' }, { z: 0.12, color: '#689763' }],
    size: [0.27, 0.13, 0.42],
    tilt: 0.37,
  },
  heather: {
    foliage: { xSpacing: 0.24, y: 0.16, size: [0.45, 0.39, 0.42], color: '#718375' },
    bloom: { xSpacing: 0.25, centerY: 0.35, edgeRise: 0.07, zSpacing: 0.07, size: [0.19, 0.24, 0.22], color: '#ac8396' },
  },
  stalk: {
    leaf: { x: 0.14, centerHeightRatio: 0.43, width: 0.075, depth: 0.11, tilt: 0.22 },
    head: { x: 0.215, centerHeightRatio: 0.94, width: 0.19, depth: 0.20 },
    family: {
      reed: { height: 1.17, leaf: fieldLeaf, headHeight: 0.29, head: seedHeadColors },
      crop: { height: 0.71, leaf: fieldLeaf, headHeight: 0.13, head: seedHeadColors },
      shore: { height: 0.44, leaf: '#8b9b65', headHeight: 0.13, head: seedHeadColors },
      flower: { height: 0.44, leaf: fieldLeaf, headHeight: 0.13, head: ['#dc9398', '#efb761'] },
    },
  },
} as const
