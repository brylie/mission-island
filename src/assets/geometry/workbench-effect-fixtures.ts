const water = '#539ca4'

export const waterfallStage = {
  pool: { position: [0, -0.06, -0.7], size: [7.2, 0.16, 4.6], color: water },
  bluff: { position: [0, 1.04, 1.8], size: [6.5, 2.08, 2.1], color: '#667579' },
  shelf: { position: [0, 2.08, 1.94], size: [5.2, 0.08, 1.65], color: water },
  curtain: { position: [0, 1.04, 0.36], size: [5.2, 2.23, 0.05], color: '#71b9bc', pitch: 0.41 },
  rock: { x: -2.9, z: -0.06, size: 1.1, heading: 0.3 },
  crew: { x: 3.9, z: -1.35 },
} as const

export const shoreStage = {
  water: { position: [0, -0.14, -1.28], size: [5, 0.29, 2.56], color: water },
  beach: { position: [0, -0.16, 1.13], size: [5, 0.33, 2.26], color: '#b7956c' },
  rocks: { x: [-1.64, -0.36, 1.22], z: 0.18, size: 0.49 },
  crew: { x: 2.04, z: 1.16 },
} as const

export const paddleStage = {
  water: { y: -0.14, size: [7, 0.29, 6.4], color: water },
} as const

export const rainStage = {
  crew: { x: -0.1, z: -0.23 },
  planks: { startX: -0.8, y: 0.02, z: -0.5, spacing: 0.55, count: 4, size: [0.53, 0.045, 2.1], color: '#566964' },
  rock: { x: 1.4, z: 0.65, size: 0.84, heading: -0.35 },
} as const

export const mistStage = {
  crew: { x: -0.8, z: -1.28 },
  rocks: [
    { x: -0.8, z: 0.29, size: 0.68 },
    { x: 0.9, z: -1.2, size: 0.82 },
    { x: 2.04, z: 0.9, size: 0.58 },
    { x: -1.8, z: -0.45, size: 0.8 },
  ],
} as const

export const leavesStage = {
  tree: { x: -0.9, z: -0.5, height: 2.8, variant: 0 },
  crew: { x: 1.23, z: -0.75 },
} as const

export const pollenStage = {
  crew: { x: -0.8, z: -0.85 },
} as const

export const tireDustStage = {
  pad: { y: -0.048, offsetZ: 0.75, size: [3.85, 0.084, 7.7], color: '#736853' },
} as const

export const fireStage = {
  crew: { x: -1.65, z: -0.9 },
} as const

export const extinguisherStage = {
  crew: { x: 0.49, z: -3.82 },
  tool: { y: 0.24, z: -3.23 },
  partner: { x: 2.7, z: 0.9, id: 1, headingPi: -0.72 },
} as const

export const puddleStage = {
  flagstones: { x: [-1.52, 1.52], z: [-0.79, 0, 0.79], y: 0.017, size: [0.6, 0.045, 0.72], color: '#667874' },
  flagstoneBase: { y: -0.05, size: [0.63, 0.1, 2.08], color: '#6d7772' },
  water: { y: 0.012, diameter: 2.63, height: 0.023, sides: 20, depthScale: 0.67, color: '#477b86' },
  crew: { x: -1.53, z: -0.28, heading: 0.97 },
} as const

export const windowStage = {
  wall: { width: 2.55, height: 2.72, depth: 0.18, color: '#d4916b' },
  crew: { x: -1.6, z: -0.04 },
} as const

export const sunbeamStage = {
  trees: [{ x: -1.55, z: -0.84, height: 3.7, variant: 0 }, { x: 1.86, z: -0.83, height: 3.3, variant: 2 }],
  rock: { x: 0.83, z: 0.23, size: 0.55, heading: -0.41 },
  crew: { x: -1.21, z: 0.31, id: 1 },
  beam: {
    vertices: [-1.08, 0.075, 0.09, 1.48, 0.075, 0.09, 0.78, 3.12, -0.41, -0.32, 3.12, -0.41],
    triangles: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
  },
  ground: { y: -0.015, size: [4.5, 0.03, 3.2], color: '#465649' },
} as const

export const sandStage = {
  ground: { y: -0.06, size: [6, 0.12, 4.2], color: '#bf9c6d' },
  rocks: [
    { x: 1.6, z: 0.33, size: 1.1, heading: 0.85, light: false },
    { x: -0.7, z: -0.52, size: 0.6, heading: -0.65, light: true },
  ],
  crew: { x: 0.22, z: 1.15, heading: -1.05 },
} as const

export const breathStage = {
  ground: { y: -0.045, size: [3.7, 0.09, 3.15], color: '#637773' },
  rock: { x: -1.22, z: -0.58, size: 0.71, heading: 0.75 },
} as const

export const lanternStage = {
  height: 0.94,
  legs: { x: [-0.38, 0.38], z: [-0.22, 0.22], width: 0.085, depth: 0.09, color: '#6a5c49' },
  top: { inset: 0.037, size: [0.98, 0.073, 0.63], color: '#9e815f' },
} as const

export const mothStage = {
  crew: { x: -1.2, z: -0.51, id: 1, heading: 1.17 },
} as const

export const ventStage = {
  wall: { position: [0, 0.66, -0.57], size: [2.7, 1.32, 1.37], color: '#6d766d' },
  roof: { y: 1.34, z: -0.55, width: 2.95, thickness: 0.14, depth: 1.54, color: '#486360' },
  vent: { x: 0.03, z: -0.23 },
  crew: { x: -1.71, z: 0.42 },
} as const

export const gateFrostStage = {
  frost: { thickness: 0.016, color: '#c5d6cb' },
  crew: { x: 1.03, z: 0.72, id: 1, heading: -2.7 },
} as const

export const snuffStage = {
  crew: { x: -0.74, z: -0.83, heading: 0.82 },
} as const

export const wateringStage = {
  plot: { x: 0, z: 0.72 },
  crew: { x: 0.48, z: -0.92, id: 1 },
} as const

export const sawdustStage = {
  crew: { x: -1.12, z: -0.69 },
} as const

export const crateGritStage = {
  crew: { x: -0.8, z: -0.86, heading: -0.11 },
  crate: { x: -0.76, z: -0.04 },
  pad: { y: -0.083, size: [4.5, 0.166, 2.65], color: '#a48a66' },
} as const

export const ashStage = {
  crew: { x: 0.47, z: -1.68, id: 1 },
  tool: { y: 0.24, z: -1.14 },
} as const

export const ferrySparksStage = {
  deck: { count: 10, centreIndex: 4, y: -0.042, spacing: 0.32, size: [4.85, 0.08, 0.306], color: '#776353' },
  barrier: { position: [-0.64, 0.47, -0.5], size: [2.33, 0.94, 0.14], color: '#5b7578' },
  hinge: { position: [-0.08, 0.56, -0.416], size: [0.116, 0.81, 0.09], color: '#7a8b82' },
  weld: { position: [-0.08, 0.56, -0.354], size: [0.039, 0.2, 0.037], color: '#b0b8a1' },
  crew: { x: -0.87, z: 0.17, heading: 0.83 },
} as const
