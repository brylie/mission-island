export type WaterfrontBox = readonly [
  x: number,
y: number,
z: number,
  width: number,
height: number,
depth: number,
color: string,
]

const cream = '#f5e5c2'

export const brinewickFerryGeometry = {
  hull: [
    [0, 0.13, -3.02, 12, 1.32, 36, '#3b5158'],
    [0, 0.96, -3.07, 11.7, 0.77, 35.78, '#a9473d'],
    [0, 1.58, -3.04, 11.8, 0.38, 35.70, '#bca685'],
    [0, 1.12, -21.20, 10.7, 0.87, 0.62, '#375058'],
  ] satisfies WaterfrontBox[],
  deckSide: {
    rail: [
      [5.65, 1.49, -2.98, 0.37, 0.38, 35.9, cream],
      [5.6, 2.64, -3, 0.13, 0.16, 35.45, cream],
    ] satisfies WaterfrontBox[],
    posts: { x: 5.6, y: 2.18, firstZ: -19, endZ: 15, spacing: 4.5, size: [0.17, 0.92, 0.17], color: cream },
    deckMarkings: [
      [3.2, 1.79, 3, 0.13, 0.018, 12.7, cream],
      [5.1, 2.10, 12.7, 0.95, 0.78, 2.0, '#52696c'],
    ] satisfies WaterfrontBox[],
  },
  bridge: [
    [0, 3.22, -15.9, 9.1, 3, 7.65, cream],
    [0, 4.86, -15.9, 9.6, 0.31, 8.16, '#42686c'],
    [0, 3.84, -12.04, 7.75, 1.12, 0.10, '#547a83'],
  ] satisfies WaterfrontBox[],
  windowFrames: { x: [-2.75, -1.37, 0, 1.37, 2.75], y: 3.84, z: -11.98, size: [0.12, 1.18, 0.08], color: cream },
  roofEquipment: [
    [-3.65, 5.54, -18.12, 0.69, 1.99, 0.81, '#ac5648'],
    [0.47, 5.75, -16, 0.13, 1.63, 0.13, '#626f69'],
    [0.47, 6.27, -16, 1.38, 0.10, 0.13, '#626f69'],
  ] satisfies WaterfrontBox[],
} as const

export const quayCrateStack = {
  count: 3,
  baseCentreY: 0.32,
  size: [1.3, 0.59, 1.2],
  colors: ['#c4a275', '#95a690'],
  band: { x: [-0.52, 0.52], size: [0.12, 0.61, 1.24], color: '#e2c29a' },
} as const

export const quayBollard = {
  top: 4.7,
  body: { topDiameter: 0.69, bottomDiameter: 0.86, sides: 10, color: '#8a9185' },
  cap: { size: [0.78, 0.27, 0.78], color: cream },
} as const

export const rescueSlipPosts = { distanceFromCentre: 5.2, centreY: 0.48, size: [0.36, 1.1, 0.36], color: '#e29c62' } as const

export const rescueSkiffOutboard = [
  [0, 0.4, -2.4, 0.48, 0.69, 0.42, '#54625b'],
  [0, 0.81, -2.44, 0.68, 0.34, 0.55, '#c8734b'],
] as const satisfies readonly WaterfrontBox[]
