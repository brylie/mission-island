type Point = readonly [x: number, y: number, z: number]
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

export const honeyPropPaint = {
  cream: '#f8dfb5',
  wood: '#af8153',
  darkWood: '#745741',
} as const

const jarShelfY = 0.813

export const honeyJar = {
  body: [0, 0.076, 0, 0.126, 0.143, 0.148, 12] satisfies Cylinder,
  lid: [0, 0.155, 0, 0.134, 0.134, 0.026, 12] satisfies Cylinder,
  label: [0, 0.081, 0.068, 0.073, 0.049, 0.009] satisfies Box,
  highlight: [-0.042, 0.101, 0.059, 0.013, 0.044, 0.008] satisfies Box,
  empty: { body: '#afc4ba', lid: '#c6d9c8' },
  filled: { body: '#e39a32', lid: '#85583f' },
  highlightColor: '#fff1c8',
} as const

export const honeyBench = {
  topY: 0.77,
  topThickness: 0.085,
  leg: { insetX: 0.15, insetZ: 0.12, y: 0.366, size: [0.093, 0.73, 0.092] },
} as const

export const honeyShelf = {
  bench: { width: 0.92, depth: 0.52 },
  jar: { x: [-0.27, -0.03, 0.21], y: jarShelfY },
  priceCard: {
    backing: [0.318, 0.915, -0.04, 0.22, 0.19, 0.024] satisfies Box,
    tilt: -0.23,
    textureSize: { width: 192, height: 128 },
    title: { y: 52, font: 'bold 35px Georgia' },
    price: { y: 96, font: 'bold 28px Georgia' },
    ink: '#655141',
    paper: '#f3d5a2',
    face: {
      positions: [-0.104, -0.087, -0.015, 0.104, -0.087, -0.015, 0.104, 0.087, -0.015, -0.104, 0.087, -0.015],
      indices: [0, 1, 2, 0, 2, 3],
      uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    },
  },
} as const

const landingBoard = { y: 0.482, z: 0.401, width: 0.59, height: 0.043, depth: 0.154 } as const
const entrance = { y: 0.536, z: 0.40, width: 0.37 } as const

export const honeyHive = {
  feet: { x: [-0.3, 0.3], y: 0.17, size: [0.12, 0.34, 0.72] },
  base: { box: [0, 0.358, 0, 0.85, 0.068, 0.80] satisfies Box, color: '#af9d77' },
  tiers: { y: [0.52, 0.77, 1.0], size: [0.79, 0.24, 0.70] },
  trim: { y: [0.64, 0.884], z: 0.352, size: [0.755, 0.036, 0.033], color: '#969479' },
  landingBoard,
  entrance,
  entranceSlot: { z: 0.356, height: 0.065, depth: 0.024, color: '#4b4b3a' },
  grips: { x: [-0.41, 0.41], y: 0.78, size: [0.042, 0.078, 0.33] },
  roof: { box: [0, 1.16, 0, 0.95, 0.117, 0.86] satisfies Box, tilt: 0.076 },
  paint: {
    light: { body: '#d9cda3', roof: '#557b73' },
    dark: { body: '#c6b984', roof: '#6f9180' },
  },
} as const

export const honeyKit = {
  bench: { width: 0.92, depth: 0.53 },
  jar: [-0.22, jarShelfY, 0] satisfies Point,
  brim: [0.18, 0.83, 0.02, 0.23, 0.23, 0.023, 12] satisfies Cylinder,
  hat: { shape: [0.18, 0.877, 0.02, 0.16, 0.14, 0.16] satisfies Ellipsoid, color: '#d7c496' },
} as const

const kettleSides = 14
export const honeyExtractor = {
  bench: { width: 1.45, depth: 0.65 },
  posts: { x: [-0.82, 0.82], y: 1.04, z: -0.32, size: [0.086, 2.08, 0.09] },
  awning: { box: [0, 2.10, -0.035, 1.94, 0.10, 1.03] satisfies Box, tilt: 0.14, color: '#91a58a' },
  drum: { shape: [-0.33, 1.04, -0.04, 0.41, 0.36, 0.45, kettleSides] satisfies Cylinder, color: '#ad6e48' },
  lid: { shape: [-0.33, 1.274, -0.04, 0.39, 0.40, 0.041, kettleSides] satisfies Cylinder, color: '#b0aa93' },
  crank: [-0.27, 1.355, -0.036, 0.34, 0.034, 0.035] satisfies Box,
  knob: [-0.105, 1.388, -0.036, 0.046, 0.046, 0.09, 8] satisfies Cylinder,
  spout: { box: [-0.33, 0.94, 0.186, 0.06, 0.045, 0.155] satisfies Box, color: '#b99467' },
  jar: [-0.33, jarShelfY, 0.247] satisfies Point,
  comb: {
    position: [0.34, 1.016, -0.04] satisfies Point,
    tilt: -0.32,
    frame: { box: [0, 0, 0, 0.39, 0.34, 0.042] satisfies Box, color: '#b9895d' },
    cell: {
      rows: 4,
      columns: 5,
      spacing: 0.065,
      stagger: 0.023,
      staggerPeriod: 2,
      z: 0.022,
      diameter: 0.064,
      thickness: 0.017,
      sides: 6,
      darkCellInterval: 4,
      amber: '#e5ab45',
      gold: '#f2cc78',
    },
  },
} as const

const veilSides = 13
export const beekeepingGear = {
  crown: [0, 1.76, 0.027, 0.57, 0.68, 0.22, veilSides] satisfies Cylinder,
  brim: [0, 1.63, 0.034, 0.76, 0.76, 0.061, veilSides] satisfies Cylinder,
  net: [0, 1.445, 0.052, 0.67, 0.60, 0.365, veilSides] satisfies Cylinder,
  collar: [0, 1.25, 0.052, 0.591, 0.605, 0.042, veilSides] satisfies Cylinder,
  bindingColor: '#d5bb87',
  netMaterial: { color: '#524d3d', opacity: 0.25 },
  jar: [-0.42, 0.995, 0.50] satisfies Point,
} as const
