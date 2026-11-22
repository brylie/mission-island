export const shellRockCap = {
  rockColor: '#798b80',
  offset: [0.025, 0.165, -0.015],
  size: [0.16, 0.055, 0.12],
  color: '#ecd3aa',
} as const

export const tidePoolDressing = {
  count: 17,
  patch: { size: 4, angle: 1.77, spacingAngle: 0.105 },
  across: { radius: 2.18, variation: 0.17, frequency: 4.1 },
  along: { radius: 1.47, variation: 0.15, frequency: 2.5 },
  limpet: { centreY: 0.033, tip: 0.024, base: 0.16, height: 0.085, sides: 7, color: '#d4c1a0' },
  wrack: { count: 3, spacing: 0.046, centreY: 0.074, size: [0.074, 0.21, 0.15], colors: ['#65744b', '#848045'], segments: 5, tilt: 0.3, tiltStep: 0.25 },
} as const
