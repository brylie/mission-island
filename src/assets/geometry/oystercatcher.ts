type Section = readonly [z: number, centerY: number, halfWidth: number, halfHeight: number]
type Pivot = readonly [x: number, y: number, z: number]

export const oystercatcherGeometry = {
  plumage: { pale: '#f1e8ce', dark: '#37454a' },
  motion: { stepRate: 13, stridePitch: 0.44, probeRate: 2.2, mantleRest: 0.08, mantleDip: 0.84, headDip: 0.78 },
  torso: {
    pivotY: 0.215,
    belly: [
      [-0.21, 0.024, 0.012, 0.012],
      [-0.11, 0.028, 0.066, 0.043],
      [0.002, 0.02, 0.087, 0.077],
      [0.093, 0.036, 0.074, 0.078],
      [0.136, 0.064, 0.038, 0.041],
    ] satisfies readonly Section[],
    mantle: [
      [-0.17, 0.053, 0.006, 0.005],
      [-0.075, 0.071, 0.059, 0.023],
      [0.021, 0.078, 0.073, 0.041],
      [0.088, 0.069, 0.068, 0.059],
      [0.13, 0.057, 0.031, 0.050],
    ] satisfies readonly Section[],
  },
  wing: {
    x: 0.046,
    headingRad: 0.14,
    profile: [
      [-0.245, 0.027, 0.002, 0.003],
      [-0.13, 0.043, 0.032, 0.027],
      [-0.02, 0.055, 0.054, 0.046],
      [0.05, 0.064, 0.041, 0.050],
      [0.081, 0.067, 0.014, 0.025],
      [0.087, 0.067, 0.002, 0.010],
    ] satisfies readonly Section[],
  },
  leg: {
    pivot: [0.042, 0.22, 0.013] satisfies Pivot,
    shin: { centerY: -0.105, topDiameter: 0.014, bottomDiameter: 0.010, height: 0.22, sides: 8, color: '#be806c' },
    toes: {
      spreadsRad: [-0.52, 0, 0.52],
      lateralSpread: 0.018,
      y: -0.211,
      z: 0.029,
      size: [0.009, 0.010, 0.073],
      segments: 3,
      color: '#bd816e',
    },
  },
  head: {
    pivot: [0, 0.058, 0.075] satisfies Pivot,
    hood: [
      [-0.056, 0.034, 0.024, 0.036],
      [-0.032, 0.046, 0.050, 0.057],
      [0.002, 0.061, 0.061, 0.065],
      [0.032, 0.067, 0.061, 0.060],
      [0.059, 0.066, 0.046, 0.049],
      [0.079, 0.06, 0.023, 0.028],
      [0.086, 0.06, 0.010, 0.014],
    ] satisfies readonly Section[],
    bill: {
      profile: [
        [0.069, 0.059, 0.021, 0.022],
        [0.10, 0.055, 0.017, 0.014],
        [0.205, 0.049, 0.005, 0.007],
      ] satisfies readonly Section[],
      sides: 8,
      color: '#df783c',
    },
    eyes: {
      y: 0.084,
      segments: 5,
      ring: { x: 0.054, z: 0.038, size: [0.013, 0.025, 0.025], color: '#db9350' },
      pupil: { x: 0.061, z: 0.039, size: [0.007, 0.013, 0.013], color: '#202a2a' },
    },
  },
} as const
