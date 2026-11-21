// Walking and cargo use simpler shapes around the same trunks and rocks.
export const islandTreeGeometry = { trunkRadius: 0.265, trunkHeightRatio: 0.5 } as const

export const islandRockGeometry = {
  centerHeightRatio: 0.12,
  heightRatio: 0.78,
  depthRatio: 1.1,
  walkingFootprint: { halfWidthRatio: 0.48, halfDepthRatio: 0.53 },
  cargoRadiusRatio: 0.43,
} as const

export const northernTreeGeometry = {
  trunkWidth: 0.2,
  trunkDepth: 0.23,
  trunkHeightRatio: 2,
  walkingRadius: 0.14,
  cargoHalfWidth: 0.12,
  cargoHalfDepth: 0.13,
} as const

export const northernRockGeometry = {
  centerHeightRatio: 0.27,
  widthRatio: 2.3,
  depthRatio: 1.6,
  walkingRadiusRatio: 0.9,
  cargoHalfExtents: { widthRatio: 0.84, heightRatio: 0.4, depthRatio: 0.62 },
} as const
