export const wildflowerMeadowGeometry = {
  height: { minimum: 0.19, variation: 0.28 },
  tipLeanRatio: 1.25,
  stem: {
    belowGroundM: 0.015,
    faceHalfWidthM: 0.052,
    crossingHalfWidthM: 0.045,
    crossingHeightRatio: 0.76,
    color: '#527f57',
  },
  petals: {
    count: 3,
    halfWidthM: 0.08,
    heightM: 0.093,
    belowTipM: 0.06,
    rotationRad: 0.27,
    color: '#f1dda6',
  },
  eye: { halfWidthM: 0.03, heightM: 0.069, belowTipM: 0.043, rotationRad: 0.43, color: '#e3a348' },
} as const
