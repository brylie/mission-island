// All three biome callers use the same starting dimensions for props and their support footprints.
export const biomePatchGeometry = {
  tree: { baseHeightM: 2.7, heightPerRadianM: 0.24, supportWidthM: 0.53 },
  rock: { baseSizeM: 0.8, sizePerRadianM: 0.13, supportDepthRatio: 1.1, supportHeightRatio: 0.51 },
} as const

export const biomeGroundCover = {
  distribution: {
    angleStepRad: 2.39996,
    seedWobbleRad: 0.6,
    minimumRadiusM: 0.1,
    radiusSpanM: 0.42,
    radiusBandStride: 7,
    radiusBands: 17,
  },
  leaf: { shoulderReachM: 0.1, shoulderHeightRatio: 0.78, tipReachM: 0.19 },
  grass: { shoots: 28, leavesPerShoot: 1, heightBands: 5, tipHeightM: 0.26, heightStepM: 0.072, baseY: 0, halfWidthM: 0.041, color: '#8c9c4f' },
  clover: { shoots: 18, leavesPerShoot: 3, heightBands: 3, tipHeightM: 0.1, heightStepM: 0.04, baseY: 0.04, halfWidthM: 0.074, color: '#478254' },
  flowers: { x: [-0.24, 0.18], y: 0.19, zRatio: 0.6, size: [0.13, 0.12, 0.13], segments: 4, color: '#ece4cb' },
} as const

export const juniperSupport = {
  logs: { offsets: [-0.8, 0, 0.8], width: 0.8, depth: 0.45, height: 0.42 },
  trees: { width: 0.5, depth: 0.5 },
  stones: { widthRatio: 0.84, depthRatio: 0.92 },
} as const
