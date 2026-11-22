const sides = 36
export const biomeStage = {
  ground: { height: -0.6, color: '#394942' },
  soil: { y: -0.32, top: 16.04, bottom: 15.8, height: 0.54, color: '#856e50', sides },
  surface: { y: -0.05, top: 16, bottom: 16.05, height: 0.1, sides },
} as const

export const biomeWalkStage = {
  startZ: -4.5,
  camera: { beta: 1.25, radius: 3.9, maximumBeta: 1.55, targetHeight: 1.03 },
  motion: { speed: 2.5, gaitRate: 1.65, stride: 0.55 },
} as const
