export const tailoringGeometry = {
  sides: 24,
  softness: 0.90,
  opening: {
    liningShade: 0.46,
    edge: { rise: 0.001, inset: 0.006 },
    innerEdge: { drop: 0.005, inset: 0.009 },
    interiorScale: 0.80,
  },
  applique: { lift: 0.0035, edgeFractions: [0, 0.25, 0.5, 0.75], rings: 4 },
} as const

export const waistbandGeometry = {
  sides: 32,
  opening: 0.036,
  rows: [
    [0.718, 0, -0.002, 0.256, 0.156, false],
    [0.755, 0, -0.002, 0.277, 0.165, false],
    [0.784, 0, -0.004, 0.275, 0.169, false],
    [0.800, 0, -0.005, 0.270, 0.169, true],
    [0.823, 0, -0.011, 0.258, 0.155, true],
    [0.829, 0, -0.011, 0.253, 0.150, true],
  ],
} as const
