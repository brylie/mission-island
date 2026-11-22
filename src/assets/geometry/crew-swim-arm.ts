type ShoulderRing = readonly [y: number, x: number, z: number, halfWidth: number, halfDepth: number]

export const swimShoulder = {
  sides: 20,
  softness: 0.93,
  rings: [
    [-0.222, 0.037, -0.018, 0.080, 0.090],
    [-0.175, 0.018, -0.024, 0.086, 0.095],
    [-0.131, -0.004, -0.030, 0.091, 0.102],
    [-0.089, -0.026, -0.034, 0.094, 0.111],
    [-0.049, -0.057, -0.035, 0.094, 0.114],
    [-0.012, -0.085, -0.032, 0.086, 0.101],
    [0.023, -0.114, -0.031, 0.081, 0.093],
    [0.042, -0.148, -0.033, 0.042, 0.054],
  ] satisfies readonly ShoulderRing[],
  entry: { sideShift: 0.058, drop: 0.031, tangent: [0.32, 0.074, 0.007] },
  exitTangentY: -0.195,
} as const
