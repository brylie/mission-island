export const fieldReviewViews = {
  shore: { height: 0.20, alpha: -1.97, beta: 1.08, radius: 7.5, hour: 11.5, rain: 0 },
  meadow: { height: 0.66, alpha: -1.72, beta: 1.35, radius: 6.5, hour: 15, rain: 0 },
  paving: { point: { x: 40, z: 8.24 }, height: 0.12, alpha: -0.19, beta: 1.47, radius: 10, hour: 12, rain: 0.65 },
  mist: { zOffset: -2, height: 0.84, alpha: 0.09, beta: 1.46, radius: 17, hour: 6.6, rain: 0 },
} as const

export const fieldReviewCamera = {
  terrainClearance: 0.28,
  initialBeta: 1.1,
  radius: 9,
  nearClip: 0.065,
  farClip: 620,
  minRadius: 1.5,
  minBeta: 0.12,
  maxBetaHalfTurns: 0.49,
  wheelDelta: 0.06,
  meadowWalkTilt: 0.2,
  meadowMaxRadius: 42,
  maxRadiusMultiplier: 4,
} as const
