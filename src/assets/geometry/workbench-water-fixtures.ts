type Point = readonly [x: number, y: number, z: number]
type Box = readonly [x: number, y: number, z: number, width: number, height: number, depth: number]
type DockDeck = readonly [x: number, firstBoardZ: number, top: number, boardCount: number]
type Rock = readonly [x: number, z: number, size: number, angle: number, light: boolean]

const dockWaterColor = '#44848d'

export const bobberStage = {
  water: { box: [0, -0.12, 0, 4.35, 0.24, 3.52] satisfies Box, color: dockWaterColor },
  deck: [-2.5, 1.47, 0.1, 7] satisfies DockDeck,
} as const

export const slipwayStage = {
  apron: { box: [0, -0.061, -0.15, 4.7, 0.122, 9] satisfies Box, color: '#778681' },
  puddles: { x: [0.94, -0.94], y: 0.013, z: 0.15, size: [1.25, 0.023, 2.5], color: '#508f98' },
  edgeStripes: { x: [-2.2, 2.2], y: 0.005, z: -0.12, size: [0.08, 0.018, 8.7], color: '#c2c3ad' },
} as const

export const hullDrainStage = {
  cradle: {
    z: [-1.45, 0.91],
    rail: { y: 0.51, size: [2.57, 0.17, 0.25], color: '#9e7951' },
    feet: { x: [-0.98, 0.98], y: 0.235, size: [0.21, 0.47, 0.22], color: '#7f6b4d' },
  },
  hull: {
    position: [0, 1.02, -0.28] satisfies Point,
    pitchRad: 0.175,
    drainOutlet: [0, -0.245, -2.23] satisfies Point,
  },
  floor: { box: [0, -0.056, 0, 3.95, 0.112, 6.65] satisfies Box, color: '#818b79' },
  puddle: {
    position: [0, 0.015, 2.36] satisfies Point,
    diameter: 0.94,
    height: 0.025,
    sides: 14,
    color: '#527b7b',
  },
} as const

const mooringWestPileX = -1.65
const mooringEastPileX = 1.65

export const mooringStage = {
  water: { box: [0, -0.096, 0, 5.55, 0.193, 3.28] satisfies Box, color: dockWaterColor },
  deck: [0, -0.63, 0.11, 2] satisfies DockDeck,
  piles: { x: [mooringWestPileX, mooringEastPileX], z: -0.18, top: 0.75 },
  rope: {
    startX: mooringWestPileX,
    endX: mooringEastPileX,
    endY: 0.67,
    z: -0.15,
    sagM: 0.235,
    segments: 12,
    segment: { width: 0.28, height: 0.035, depth: 0.041, color: '#d0ac76' },
  },
} as const

export const bootTrailStage = {
  water: { box: [0, -0.079, 0, 4.05, 0.158, 4.2] satisfies Box, color: dockWaterColor },
  deck: [0, 1.96, 0.067, 9] satisfies DockDeck,
} as const

export const waterTrayGeometry = {
  y: -0.11,
  thickness: 0.22,
  color: '#387b83',
  wake: [6.4, 11.2],
  wading: [4.6, 6.15],
  fishThrash: [5, 4.4],
  eddy: [5.8, 5.6],
} as const

export const wadingRocks = [
  [1.7, -0.55, 0.61, 0.4, true],
  [-1.7, 1.55, 0.73, 1.85, false],
] as const satisfies readonly Rock[]

export const submergedStage = {
  surfaceY: 0.94,
  bed: { box: [0, -0.79, 0, 5.8, 0.18, 3.85] satisfies Box, color: '#3b6566' },
  backWall: { box: [0, 0.03, -1.89, 5.8, 1.81, 0.1] satisfies Box, color: '#326e79' },
  water: { width: 5.8, depth: 3.72, thickness: 0.034, centerBelowSurfaceM: 0.017, color: '#589fa4', opacity: 0.24 },
  rockGroundY: -0.7,
  rocks: [
    [-2.15, -0.9, 0.61],
    [2.15, -0.73, 0.68],
    [-1.72, 0.99, 0.39],
  ] satisfies readonly (readonly [x: number, z: number, size: number])[],
} as const

export const eddyStage = {
  rocks: [
    [0, 0, 1.48, 0.7, false],
    [-0.85, 0.66, 0.45, -1.1, true],
  ] satisfies readonly Rock[],
  banks: { x: [-2.15, 2.22], y: 0.015, size: [0.72, 0.06, 5.6], color: '#6d7771' },
} as const
