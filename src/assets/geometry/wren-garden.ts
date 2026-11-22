const plank = '#a17a55'
const leaf = '#5f8a4e'
const stoneTones = ['#8d877a', '#9a9384', '#7f7b70', '#a39b89'] as const

const woodpileLength = 0.62
export const woodpileGeometry = {
  courses: 3,
  bottomLogCount: 4,
  logDiameter: 0.21,
  logLength: woodpileLength,
  layout: { firstX: -0.36, firstY: 0.12, logSpacing: 0.24, rowInset: 0.12, rowRise: 0.2 },
  sides: 7,
  bark: '#8a6646',
  endGrain: { z: -woodpileLength / 2 - 0.005, diameter: 0.17, thickness: 0.02, color: '#c9a678' },
  supportBoxes: [[1.05, 0.65, 0.6]],
} as const

const barrelHeight = 0.8
const barrelRimDiameter = 0.55
export const rainBarrelGeometry = {
  height: barrelHeight,
  rimDiameter: barrelRimDiameter,
  sides: 10,
  staves: { topDiameter: 0.52, baseDiameter: 0.48, color: '#6f5a43' },
  hoops: { centers: [0.18, 0.62], thickness: 0.05, color: '#3f3c37' },
  supportBoxes: [[barrelRimDiameter, barrelRimDiameter, barrelHeight]],
} as const

const sawhorseBeamWidth = 1.1
export const sawhorseGeometry = {
  beam: { width: sawhorseBeamWidth, y: 0.66, height: 0.1, depth: 0.12 },
  legs: { x: [-0.42, 0.42], y: 0.33, z: 0.13, size: [0.07, 0.72, 0.07], splay: 0.3 },
  board: { x: 0.1, y: 0.74, size: [1.5, 0.04, 0.26], heading: 0.2, color: '#c39a6b' },
  color: plank,
  supportBoxes: [[sawhorseBeamWidth, 0.4, 0.75]],
} as const

const mendingBenchSurface = { width: 1.6, depth: 0.7, top: 0.86, centreY: 0.82, thickness: 0.08 } as const
const benchTray = { x: 0.35, y: 0.89, z: 0.1, size: [0.4, 0.06, 0.26], color: '#3f5d5a' } as const
const benchWood = '#7a5a3f'
export const mendingBenchGeometry = {
  surface: mendingBenchSurface,
  surfaceColor: '#a77a52',
  legs: { x: [-0.7, 0.7], y: 0.4, z: [-0.27, 0.27], size: [0.09, 0.8, 0.09], color: benchWood },
  shelf: { y: 0.2, size: [1.4, 0.05, 0.55], color: benchWood },
  tray: benchTray,
  pin: { x: benchTray.x, y: 0.95, z: benchTray.z },
  supportBoxes: [[mendingBenchSurface.width, mendingBenchSurface.depth, mendingBenchSurface.top]],
} as const

export const flowerBedFrame = {
  overhang: 0.1,
  supportHeight: 0.16,
  plank: { centerY: 0.07, height: 0.14, color: plank },
  soil: { centerY: 0.15, height: 0.04, inset: 0.04, color: '#6a513a' },
  plants: {
    spacing: 0.32,
    stagger: 0.05,
    patternPeriod: 2,
    height: { first: 0.16, columnStep: 7, rowStep: 3, levels: 5, levelStep: 0.025 },
    leaves: { y: 0.17, width: 0.24, depth: 0.22, color: leaf },
    bloom: { x: 0.03, y: 0.2, z: -0.02, size: [0.11, 0.09, 0.11], rowColorOffset: 2 },
  },
} as const

export const wrenPathModel = {
  front: {
    gateInset: 0.38,
    doorClearance: 0.85,
    slabs: [{ x: -0.05, width: 0.7 }, { x: 0.07, width: 0.62 }, { x: -0.03, width: 0.74 }, { x: 0.05, width: 0.66 }],
    lift: 0.02,
    height: 0.05,
    depth: 0.42,
    color: stoneTones[1],
  },
  back: {
    scatter: { seed: 7721, start: 0.55, endClearance: 0.2, spacing: 0.78, spacingJitter: 0.3, sway: 0.26 },
    radii: { x: 0.19, xJitter: 0.08, z: 0.15, zJitter: 0.07 },
    lift: 0.012,
    thickness: 0.045,
    sides: 8,
    colors: stoneTones,
  },
} as const

const lavender = '#b99bd8'
const paleFlower = '#f4ead0'
const goldenFlower = '#e9c35a'
export const wrenFlowerColors = {
  westBed: [lavender, paleFlower, goldenFlower],
  eastBed: [paleFlower, lavender, '#e98a6b'],
  windowBox: [lavender, paleFlower, goldenFlower, lavender],
} as const

export const wrenCottageTrim = {
  chimney: {
    offset: { x: 1.15, z: 0.55 },
    body: { width: 0.5, depth: 0.5, aboveRidge: 0.55, roofOverlap: 0.4, color: '#9c5a45' },
    cap: { rise: 0.04, sizeAllowance: 0.1, height: 0.08, color: '#7a4636' },
  },
  windowBox: {
    wood: { y: 1.42, size: [1.02, 0.17, 0.2], color: plank },
    leaves: { firstX: -0.36, y: 1.56, size: [0.2, 0.14, 0.14], color: leaf },
    blooms: { firstX: -0.33, y: 1.64, z: -0.03, size: [0.09, 0.08, 0.09] },
    spacing: 0.24,
  },
  lantern: {
    x: 0.82,
    y: 2.05,
    case: { outset: 0.1, size: [0.16, 0.24, 0.14], color: '#2f3a36' },
    glass: { outset: 0.17, size: [0.1, 0.15, 0.02], color: '#ffd58a' },
  },
  step: { y: 0.06, outset: 0.3, size: [1.3, 0.12, 0.5], color: '#a9a294' },
} as const
