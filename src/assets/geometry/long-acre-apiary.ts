export const apiaryHedge = {
  centerY: 0.39,
  width: 0.67,
  height: 0.86,
  heightVariation: 0.11,
  depth: 0.61,
  segments: 5,
} as const

export const apiaryRail = {
  post: { centerY: 0.36, size: [0.10, 0.72, 0.105] },
  beam: { centerY: 0.55, size: [2.34, 0.078, 0.093] },
} as const

export const apiarySteppingStone = {
  centerY: 0.025,
  size: [0.51, 0.065, 0.42],
  yawFrequency: 2,
  yawAmplitude: 0.24,
  color: '#a79470',
} as const

export const honeybee = {
  abdomen: { size: [0.082, 0.074, 0.142], color: '#dfaa36' },
  bands: { z: [-0.035, 0.02], size: [0.085, 0.075, 0.027], color: '#574332' },
  head: { y: 0.008, z: 0.071, size: [0.052, 0.052, 0.059], color: '#543d30' },
  wings: { x: 0.054, y: 0.032, z: -0.016, size: [0.094, 0.011, 0.054], color: '#f7ead0' },
  segments: 5,
} as const
