type HatPigment = 'detail' | 'trim'

export type HatSection = readonly [
  y: number,
  x: number,
  z: number,
  width: number,
  depth: number,
  pigment?: HatPigment,
]

interface HatCrown {
  name: string
  sides: number
  profile: readonly HatSection[]
}

export const reedCrownGeometry = {
  wreath: {
    phases: [0, Math.PI],
    samplesPerHalfTurn: 16,
    width: 0.298,
    depth: 0.248,
    height: 0.415,
    weaveLift: 0.009,
    twists: 6,
    rushWidth: 0.011,
    rushThickness: 0.009,
    normal: [0, 1, 0],
    sides: 6,
  },
  blade: {
    count: 11,
    heightVariants: 3,
    baseLift: 0.076,
    variantLift: 0.038,
    outwardRise: 0.1,
    sides: 6,
    // The first two points sit on the rushes. The fold and tip turn tangentially.
    root: [0.298, 0.41, 0.248, 0.009, 0.006],
    shoulder: [0.303, 0.442, 0.255, 0.020, 0.009],
    fold: { point: [0.303, 0.419, 0.261, 0.016, 0.007], tangent: 0.018, liftRatio: 0.75 },
    tip: { point: [0.291, 0.421, 0.248, 0.001, 0.001], tangent: 0.034 },
  },
} as const

export const moonpoolCrescent = {
  path: [
    [0.071, 0.513, 0.235, 0.001, 0.002],
    [0.047, 0.519, 0.238, 0.008, 0.003],
    [0.032, 0.503, 0.241, 0.010, 0.003],
    [0.034, 0.481, 0.244, 0.010, 0.003],
    [0.052, 0.473, 0.243, 0.006, 0.003],
    [0.070, 0.478, 0.238, 0.001, 0.002],
  ],
  normal: [0, 0, 1],
} as const

export const gullSkipperDetails = {
  peak: { center: [0, 0.381, 0.213], size: [0.46, 0.037, 0.31], rake: 0.10, segments: 20 },
  wing: {
    inner: [0, 0.471, 0.249, 0.005, 0.003],
    sweep: [[0.042, 0.496, 0.253, 0.008, 0.004], [0.083, 0.491, 0.247, 0.007, 0.003], [0.114, 0.480, 0.238, 0.001, 0.002]],
    normal: [0, 0, 1],
  },
} as const

export const jellybellDetails = {
  scallops: { radiusX: 0.31, radiusZ: 0.26, count: 8, lift: 0.014, fadeFromY: 0.355, fadeHeight: 0.105 },
  bow: {
    start: [-0.218, 0.397, -0.180, 0.008, 0.005],
    loops: [
      { point: [-0.219, 0.411, -0.188, 0.023, 0.009], sideX: 0.030, sideZ: 0.025 },
      { point: [-0.220, 0.413, -0.192, 0.016, 0.007], sideX: 0.048, sideZ: 0.042 },
      { point: [-0.218, 0.392, -0.187, 0.014, 0.007], sideX: 0.027, sideZ: 0.022 },
    ],
    end: [-0.218, 0.394, -0.180, 0.006, 0.004],
    normal: [-0.65, 0.1, -0.8],
    sides: 8,
  },
} as const

export const buoyWatchDetails = {
  ribbing: { rows: 3, dark: 0.73, light: 1.05 },
  pom: {
    profile: [
      [0.590, 0, -0.019, 0.035, 0.036],
      [0.604, 0, -0.021, 0.064, 0.060],
      [0.645, 0, -0.024, 0.072, 0.069],
      [0.675, 0, -0.023, 0.053, 0.052],
      [0.686, 0, -0.023, 0.017, 0.018],
    ],
    softness: 0.96,
    sides: 14,
  },
} as const

export const moonpoolBucket = {
  name: 'Moonpool stitched bucket',
  sides: 40,
  profile: [
    [0.351, 0, 0.005, 0.350, 0.312, 'detail'],
    [0.359, 0, 0.004, 0.352, 0.313, 'trim'],
    [0.364, 0, 0.004, 0.347, 0.308],
    [0.401, 0, 0, 0.296, 0.257],
    [0.407, 0, 0, 0.296, 0.255, 'detail'],
    [0.437, 0, 0, 0.290, 0.250, 'detail'],
    [0.442, 0, 0, 0.288, 0.248],
    [0.535, 0, -0.008, 0.268, 0.230],
    [0.552, 0, -0.006, 0.250, 0.214],
    [0.563, 0, 0, 0.085, 0.070],
  ],
} as const satisfies HatCrown

export const gullSkipper = {
  name: 'Gull skipper cap',
  sides: 36,
  profile: [
    [0.377, 0, 0.004, 0.283, 0.239, 'detail'],
    [0.388, 0, 0.004, 0.293, 0.247, 'detail'],
    [0.420, 0, 0, 0.295, 0.247, 'detail'],
    [0.424, 0, 0, 0.300, 0.248, 'trim'],
    [0.432, 0, 0, 0.304, 0.251, 'trim'],
    [0.438, 0, 0, 0.309, 0.254],
    [0.483, -0.009, -0.010, 0.325, 0.263],
    [0.529, -0.015, -0.015, 0.294, 0.245],
    [0.553, -0.017, -0.019, 0.163, 0.146],
    [0.558, -0.016, -0.018, 0.050, 0.052],
  ],
} as const satisfies HatCrown

export const jellybellBonnet = {
  name: 'Scalloped jellybell bonnet',
  sides: 48,
  profile: [
    [0.355, 0, 0.004, 0.309, 0.261, 'trim'],
    [0.369, 0, 0.004, 0.319, 0.270, 'trim'],
    [0.381, 0, 0, 0.310, 0.264, 'detail'],
    [0.404, 0, 0, 0.301, 0.254],
    [0.475, 0, -0.005, 0.305, 0.259],
    [0.541, 0, -0.012, 0.253, 0.222],
    [0.580, 0, -0.012, 0.150, 0.130],
    [0.596, 0, -0.009, 0.045, 0.042],
  ],
} as const satisfies HatCrown

export const buoyWatchCap = {
  name: 'Buoy watch cap',
  sides: 36,
  profile: [
    [0.375, 0, 0, 0.283, 0.238, 'detail'],
    [0.382, 0, 0, 0.298, 0.250, 'detail'],
    [0.428, 0, 0, 0.299, 0.250, 'detail'],
    [0.435, 0, 0, 0.292, 0.245, 'trim'],
    [0.445, 0, 0, 0.289, 0.242, 'trim'],
    [0.449, 0, 0, 0.287, 0.240],
    [0.494, 0, -0.003, 0.273, 0.231],
    [0.546, 0, -0.009, 0.226, 0.193],
    [0.588, 0, -0.015, 0.129, 0.115],
    [0.602, 0, -0.017, 0.047, 0.046],
  ],
} as const satisfies HatCrown
