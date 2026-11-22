export const lookoutVergeGrowth = {
  seed: 4623,
  scatter: { perBed: 43, firstRadius: 0.15, radiusRange: 0.84, minScale: 0.58, scaleRange: 0.75, trailSetback: 0.29 },
  shoots: { firstRadius: 0.59, skipEvery: 5 },
  leaves: {
    count: 5,
    paleEvery: 3,
    spread: 0.64,
    spreadVariation: 0.4,
    heightStep: 0.075,
    bendStep: 0.08,
    width: 0.026,
    widthVariation: 0.008,
  },
  flowers: { every: 6, lobes: 5, anglePi: 0.4, height: 0.034, spread: 0.075, width: 0.025, crownScale: 0.92, color: '#efd190' },
} as const

export const lookoutVergeStages = {
  ash: { height: 0.04, spread: 0.29, blades: '#695746', tips: '#8b7150', tint: '#625b58', opacity: 1 },
  shoots: { height: 0.21, spread: 0.105, blades: '#668849', tips: '#9caa58', tint: '#807461', opacity: 0.8 },
  established: { height: 0.37, spread: 0.16, blades: '#5e804c', tips: '#82965a', tint: '#8a7f5a', opacity: 0.35 },
} as const
