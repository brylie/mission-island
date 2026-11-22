export type FaceLinePoint = readonly [x: number, y: number, halfWidth: number, relief: number]

// The cheek mesh uses the skull sections in crew-scalp. This fitting space also
// carries the eye pivots, hair, and both everyday and purchased hats.
export const crewHeadFit = {
  position: [0, 1.315, 0.006],
  scale: [0.90, 0.85, 0.92],
} as const

const skinBase = '#dfac83'
const forward = [0, 0, 1] as const
const noseSections: [z: number, centerY: number, halfWidth: number, halfHeight: number][] = [
  [-0.022, 0.027, 0.031, 0.067],
  [0.010, 0.019, 0.035, 0.059],
  [0.036, -0.004, 0.048, 0.036],
  [0.055, -0.015, 0.044, 0.020],
  [0.064, -0.014, 0.028, 0.012],
]

export const crewFace = {
  base: skinBase,
  skull: { softness: 0.91, sides: 36 },
  complexion: {
    cheek: {
      center: { x: 0.177, y: 0.181, z: 0.18 },
      spread: { x: 0.095, y: 0.062, z: 0.12 },
      greenAttenuation: 0.13,
      blueAttenuation: 0.17,
    },
    baseTone: 0.91,
    heightBlend: 0.09,
    toneRiseHeight: 0.16,
  },
  nose: { sections: noseSections, position: [0, 0.205, 0.232], sides: 16 },
  eye: {
    position: { x: 0.109, y: 0.256, z: 0.218 },
    heading: 0.36,
    gazeOffsetX: -0.003,
    white: { center: [0, 0, 0.002], size: [0.110, 0.063, 0.022], color: '#e9d7b5', segments: 12 },
    iris: { y: -0.001, z: 0.013, size: [0.076, 0.060, 0.016], color: '#69452f', segments: 12 },
    pupil: { y: 0, z: 0.020, size: [0.050, 0.049, 0.010], color: '#322927', segments: 10 },
    glint: { center: [-0.010, 0.012, 0.024], size: [0.012, 0.013, 0.005], color: '#fff0db', segments: 6 },
    upperLid: {
      color: '#543a30',
      normal: forward,
      path: [
        [-0.055, -0.003, 0.004, 0.002, 0.003],
        [-0.039, 0.018, 0.010, 0.006, 0.004],
        [0, 0.028, 0.013, 0.008, 0.005],
        [0.041, 0.019, 0.009, 0.006, 0.005],
        [0.057, -0.001, 0.004, 0.002, 0.003],
      ],
    },
  },
  features: {
    normal: forward,
    brow: {
      color: '#49362e',
      rightSideLift: 0.007,
      path: [
        [0.049, 0.323, 0.007, 0.005],
        [0.083, 0.332, 0.015, 0.007],
        [0.130, 0.332, 0.014, 0.007],
        [0.171, 0.321, 0.009, 0.006],
        [0.187, 0.310, 0.003, 0.003],
      ] satisfies readonly FaceLinePoint[],
    },
    mouth: {
      color: '#824d3e',
      softSmile: [
        [-0.095, 0.124, 0.002, 0.002],
        [-0.073, 0.111, 0.005, 0.004],
        [-0.017, 0.102, 0.006, 0.004],
        [0.044, 0.107, 0.005, 0.004],
        [0.083, 0.120, 0.005, 0.004],
        [0.098, 0.137, 0.002, 0.002],
      ] satisfies readonly FaceLinePoint[],
      wideSmile: [
        [-0.122, 0.140, 0.002, 0.002],
        [-0.088, 0.119, 0.007, 0.004],
        [-0.032, 0.101, 0.009, 0.005],
        [0.040, 0.105, 0.009, 0.005],
        [0.093, 0.124, 0.007, 0.004],
        [0.121, 0.150, 0.003, 0.002],
      ] satisfies readonly FaceLinePoint[],
    },
  },
} as const

export const crewEar = {
  contour: [
    [0.133, 0.250, 0.021, 0.008, 0.011],
    [0.142, 0.256, 0.020, 0.023, 0.025],
    [0.158, 0.262, 0.016, 0.031, 0.033],
    [0.186, 0.266, 0.008, 0.035, 0.039],
    [0.212, 0.268, -0.001, 0.035, 0.041],
    [0.232, 0.267, -0.007, 0.029, 0.036],
    [0.245, 0.263, -0.010, 0.019, 0.025],
    [0.252, 0.260, -0.011, 0.007, 0.010],
  ],
  softness: 1,
  sides: 16,
} as const

export const crewCanvasCap = {
  crown: {
    contour: [
      [0.374, 0, 0.002, 0.280, 0.233],
      [0.383, 0, 0.003, 0.290, 0.245],
      [0.404, 0, 0.001, 0.292, 0.245],
      [0.414, -0.002, 0, 0.292, 0.244],
      [0.461, -0.006, -0.010, 0.276, 0.233],
      [0.513, -0.012, -0.018, 0.245, 0.210],
      [0.551, -0.016, -0.023, 0.182, 0.160],
      [0.576, -0.020, -0.020, 0.086, 0.081],
      [0.580, -0.020, -0.020, 0.028, 0.025],
    ],
    softness: 0.96,
    sides: 48,
    color: '#658775',
    seams: {
      meridianOffsetX: 0.006,
      meridianOffsetZ: 0.008,
      pairs: 3,
      sharpness: 28,
      darkening: 0.12,
    },
    band: { top: 0.405, tone: 0.85 },
  },
  brim: {
    center: [0, 0.379, 0.202],
    size: [0.466, 0.034, 0.307],
    color: '#c4b189',
    tilt: 0.085,
    segments: 24,
  },
  strap: {
    color: '#73614b',
    normal: [0, 0, -1],
    path: [
      [-0.116, 0.400, -0.216, 0.008, 0.004],
      [-0.076, 0.397, -0.237, 0.014, 0.006],
      [0, 0.395, -0.247, 0.015, 0.006],
      [0.071, 0.396, -0.239, 0.014, 0.006],
      [0.104, 0.397, -0.227, 0.009, 0.004],
    ],
  },
  keeper: {
    color: '#ab895b',
    contour: [
      [0.379, 0.047, -0.244, 0.010, 0.006],
      [0.383, 0.047, -0.245, 0.011, 0.007],
      [0.406, 0.047, -0.245, 0.011, 0.007],
      [0.411, 0.047, -0.244, 0.009, 0.005],
    ],
    softness: 0.7,
    sides: 12,
  },
} as const
