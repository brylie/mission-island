export const gullReview = {
  perch: { x: 0, y: 0.705, z: 0, heading: 0 },
  piling: { diameter: 0.43, sides: 7 },
  conditions: { clear: { hour: 12, rain: 0 }, wet: { hour: 12, rain: 1 }, dusk: { hour: 18, rain: 0 } },
  angle: 0.48,
} as const

export const juniperNatureReview = {
  clearingOffset: { x: 5, z: -3 },
  cycleSeconds: 4,
  maxGrowthSeed: 9999,
  scalePercent: { value: 100, min: 28, max: 120, step: 1 },
} as const
