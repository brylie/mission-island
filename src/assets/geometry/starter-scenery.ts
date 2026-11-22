// Walking and cargo use simpler shapes around the same trunks and rocks.
const trunkRadius = 0.265
const trunkDiameter = trunkRadius * 2
export const islandTreeGeometry = {
  trunkRadius,
  trunkHeightRatio: 0.5,
  trunk: { baseDiameter: trunkDiameter, tipDiameter: 0.31, embedDepth: 0.16, sides: 6 },
  canopy: {
    colors: ['#44784b', '#558953', '#366d4c'],
    broadleafEvery: 3,
    broadleaf: {
      crown: { yRatio: 0.64, sizeRatios: [0.8, 0.8, 0.77] },
      branch: { xRatio: 0.23, yRatio: 0.54, z: 0.27, sizeRatios: [0.58, 0.57, 0.54], color: '#619553' },
    },
    conifer: {
      sides: 7,
      lower: { yRatio: 0.55, tipDiameter: 0.1, baseRatio: 0.67, heightRatio: 0.63 },
      upper: { yRatio: 0.76, tipDiameter: 0.04, baseRatio: 0.48, heightRatio: 0.61, colors: ['#3e7852', '#55894e'] },
    },
  },
} as const

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
  trunkColor: '#675341',
  crown: { layers: 3, baseWidth: 2.25, widthStep: 0.43, baseY: 1.45, rise: 0.68, height: 1.38, segments: 4 },
  silhouette: { every: 2, y: 1.8, width: 1.7, height: 3.4, segments: 3 },
} as const

export const northernRockGeometry = {
  centerHeightRatio: 0.27,
  widthRatio: 2.3,
  depthRatio: 1.6,
  segments: 4,
  silhouette: { every: 3, y: 0.24, width: 2, depth: 1.5, segments: 3 },
  walkingRadiusRatio: 0.9,
  cargoHalfExtents: { widthRatio: 0.84, heightRatio: 0.4, depthRatio: 0.62 },
} as const
