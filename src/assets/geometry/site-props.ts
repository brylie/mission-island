export type SupportBox = readonly [width: number, depth: number, height: number, localX?: number, localZ?: number]

export const siteBench = { width: 1.7, seatDepth: 0.54, backDepth: 0.105, backZ: 0.22 } as const

// Local support volumes in metres. The seat and back, crate tiers, and barrels have separate tops.
export const sitePropSupportBoxes = {
  'splitstone': [[1.72, 2.55, 2.035, -1.72, 0.45], [1.55, 2.29, 1.385, 1.61, -0.22]],
  'bench': [[siteBench.width, siteBench.seatDepth, 0.57], [siteBench.width, siteBench.backDepth, 1.035, 0, siteBench.backZ]],
  'crates': [[0.64, 0.6, 0.54, -0.36, 0.02], [0.64, 0.61, 1.05, 0.33, -0.065]],
  'barrels': [[0.61, 0.61, 0.79, -0.37], [0.43, 0.43, 0.56, 0.34]],
  'rack': [[1.83, 0.16, 1.5]],
  'planter': [[1.66, 0.57, 0.345]],
  'scope': [[0.76, 0.76, 0.16], [0.22, 0.22, 1], [0.48, 0.82, 1.27]],
  'log': [[2.4, 0.45, 0.42], [0.19, 0.2, 0.64, -0.45, 0.09]],
  'cairn': [[0.86, 0.65, 0.225], [0.56, 0.42, 0.405, 0.055], [0.32, 0.24, 0.525, 0.02]],
  'tide-staff': [[0.18, 0.24, 1.35]],
  'gauge': [[0.14, 0.18, 1.35]],
} as const satisfies Record<string, readonly SupportBox[]>

export const fixedPropSupportBoxes = {
  jobBoard: [[1.75, 0.14, 1.95]],
  lampPost: [[0.14, 0.14, 2.74]],
  beachUmbrella: [[0.16, 0.16, 2.27]],
  woodpile: [[1.05, 0.65, 0.6]],
  rainBarrel: [[0.55, 0.55, 0.8]],
  sawhorse: [[1.1, 0.4, 0.75]],
  ridgeRack: [[1.62, 0.27, 1.16]],
  ridgeWindsock: [[0.09, 0.09, 2.64]],
  ridgeLandingSign: [[0.15, 0.15, 1.26], [1.44, 0.19, 1.545]],
} as const satisfies Record<string, readonly SupportBox[]>

export const mendingBenchFootprint = { width: 1.6, depth: 0.7 } as const
export const flowerBedFrame = { overhang: 0.1, supportHeight: 0.16 } as const
export const shellRockProfile = { depthRatio: 0.65, height: 0.23, centreHeight: 0.055, supportHeight: 0.17 } as const
export const lichenStoneProfile = { depthRatio: 0.91, heightRatio: 0.74, centreHeightRatio: 0.23, headingPerMetre: 0.62 } as const
