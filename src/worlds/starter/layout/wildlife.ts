export const starterWildflowerMeadows = {
  seed: 64286,
  patches: [[-31, 18], [-17, 29], [28, -25], [37, -23]],
  samplesPerPatch: 23,
  patchWidthM: 11,
  patchDepthM: 7,
  inlandLimit: 0.93,
} as const

export const starterUnderstorySites = {
  juniper: { groveOffsetX: 2, groveOffsetZ: 1, radiusM: 12 },
  mirrorPool: { radiusM: 16 },
  driftwood: { x: 39, z: -26.0, radiusM: 5.8, samples: 175, density: 0.52 },
  samplesPerSite: 105,
  ring: { innerRatio: 0.68, widthRatio: 0.5 },
} as const

export const driftwoodSandpipers = {
  seed: 1806,
  count: 6,
  firstBearing: 5.296,
  bearingSpacing: 0.021,
  bearingWander: 0.008,
  inlandRadius: 0.986,
  crossShoreWander: 0.006,
  crossShoreSpacing: 0.003,
} as const

export const starterOffshoreSchools = {
  bearingsRad: [-2.17, 1.19],
  coastRelativeRadius: 1.042,
  offshoreSwing: 0.007,
  bearingSwingRad: 0.115,
  patrolRadPerSecond: 0.18,
  minimumDepthM: 0.36,
} as const

export const starterBatFlock = {
  center: { x: -13, y: 5, z: 24 },
  treeSearch: { westX: -14, eastX: -5, southZ: 13 },
  treeHeightRatio: 1.025,
  fallbackRoost: { x: -9, y: 1, z: 20 },
  range: 9,
  count: 3,
  color: '#6f677e',
} as const
