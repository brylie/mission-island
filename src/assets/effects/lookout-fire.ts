export const lookoutFlame = {
  capacity: 380,
  emitter: {
    height: 0.15,
    minDirection: [-0.33, 0.74, -0.33],
    maxDirection: [0.33, 1.45, 0.33],
    minPoint: [-1.14, 0, -0.92],
    maxPoint: [1.14, 0.18, 0.92],
  },
  lifetime: [0.31, 0.84],
  emitPower: [1.3, 3.1],
  gravity: [0, 0.9, 0],
  sizeGradients: [
    [0, 0.32, 0.72],
    [0.28, 0.46, 0.92],
    [1, 0.13, 0.43],
  ],
  colorGradients: [
    [0, 1, 0.62, 0.12, 0.8],
    [0.48, 1, 0.28, 0.038, 0.76],
    [1, 0.74, 0.06, 0.015, 0],
  ],
  angularSpeed: [-1.6, 1.6],
  emission: { baseRate: 143, pulseAmplitude: 26, pulseSpeed: 8.5 },
} as const

export const lookoutFireSeeds = { smoke: 1293, embers: 1294 } as const
