export const chestSize = { width: 0.92, depth: 0.64, height: 0.66 }

const chestLidHeight = 0.128
export const homeChestModel = {
  dimensions: chestSize,
  wood: '#a77a52',
  body: { lidClearance: 0.145, widthInset: 0.045, depthInset: 0.035 },
  lining: { belowRim: 0.072, z: -0.014, widthInset: 0.16, height: 0.1, depthInset: 0.015 },
  lid: { hingeRise: 0.007, centerY: chestLidHeight / 2, height: chestLidHeight },
  latch: { y: -0.012, forwardOfLid: 0.009, size: [0.133, 0.16, 0.032], color: '#dbb26c' },
} as const

export const wardrobeModel = {
  wood: '#9c6a47',
  doorWood: '#bc8b5c',
  body: { y: 0.97, size: [1.05, 1.94, 0.33] },
  cornice: { y: 1.97, size: [1.15, 0.09, 0.39] },
  door: { x: 0.225, y: 0.97, z: -0.17, size: [0.43, 1.7, 0.064] },
  panel: { y: 1.44, z: -0.207, size: [0.32, 0.38, 0.019] },
  pull: { x: 0.078, y: 0.96, z: -0.219, size: [0.034, 0.145, 0.042], color: '#654937' },
} as const

const counterClothBlue = '#537d8c'
export const clothingCounterModel = {
  wood: '#a77856',
  body: { y: 0.51, size: [1.46, 1.02, 0.42] },
  top: { y: 1.06, size: [1.58, 0.12, 0.52] },
  banner: { y: 0.68, z: 0.216, size: [1.26, 0.45, 0.027], color: counterClothBlue },
  cloth: { x: 0.31, firstY: 1.16, firstWidth: 0.47, widthStep: 0.03, thickness: 0.072, depth: 0.27, colors: ['#84aaa7', '#ccead7', counterClothBlue] },
} as const
