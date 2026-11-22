export const foxgloveRosette = {
  leaf: {
    count: 11,
    segments: 4,
    shape: [[0, 0.025, 0.006, 0.003], [0.12, 0.085, 0.049, 0.016], [0.24, 0.10, 0.064, 0.014], [0.34, 0.046, 0.034, 0.008], [0.395, 0.032, 0.002, 0.001]],
    colors: ['#456947', '#597448'],
    spread: 2.4,
    minimumScale: 0.74,
    scaleRange: 0.38,
    tiltStep: -0.16,
    tiltLevels: 3,
  },
} as const

export const foxgloveSpike = {
  stem: { height: 0.91, heightVariation: 0.21, top: 0.009, bottom: 0.027, segments: 8, color: '#698454' },
  bells: {
    count: 14,
    segments: 10,
    colors: ['#c3739b', '#d986ae', '#eba9be'],
    shape: [
      [0, 0.012, 0.009, 0.009],
      [0.026, 0.019, 0.023, 0.025],
      [0.066, 0.003, 0.031, 0.032],
      [0.086, -0.027, 0.033, 0.031],
      [0.095, -0.037, 0.028, 0.024],
      [0.068, -0.022, 0.023, 0.020],
      [0.046, -0.007, 0.013, 0.011],
    ],
    height: { start: 0.37, span: 0.61 },
    yaw: { frequency: 1.78, amplitude: 1.38 },
    pitch: { base: 0.16, variation: 0.63 },
    scale: { base: 1.44, taper: 1.05 },
  },
} as const
