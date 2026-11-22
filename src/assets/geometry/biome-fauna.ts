type Ellipsoid = readonly [x: number, y: number, z: number, diameterX: number, diameterY: number, diameterZ: number]

export const biomeFoxGeometry = {
  paint: { coat: '#ba653c', cream: '#e5d9b9', nose: '#433b33', paws: '#523c32' },
  segments: 5,
  torso: [0, 0.42, 0, 0.39, 0.43, 0.88] satisfies Ellipsoid,
  head: [0, 0.61, 0.35, 0.39, 0.4, 0.41] satisfies Ellipsoid,
  muzzle: [0, 0.55, 0.56, 0.23, 0.18, 0.28] satisfies Ellipsoid,
  nose: [0, 0.57, 0.7, 0.09, 0.08, 0.08] satisfies Ellipsoid,
  tail: { body: [0, 0.36, -0.58, 0.28, 0.28, 0.68] satisfies Ellipsoid, pitchRad: -0.18 },
  tailTip: [0, 0.31, -0.85, 0.19, 0.19, 0.25] satisfies Ellipsoid,
  ears: { x: 0.13, y: 0.84, z: 0.29, baseDiameter: 0.18, height: 0.26, sides: 3 },
  legs: { x: 0.14, y: 0.17, z: [-0.24, 0.24], size: [0.12, 0.32, 0.13] },
} as const

export const hareGeometry = {
  segments: 6,
  torso: [0, 0.05, 0, 0.33, 0.25, 0.78] satisfies Ellipsoid,
  head: [0, 0.18, 0.23, 0.29, 0.35, 0.35] satisfies Ellipsoid,
  ears: {
    x: 0.071,
    pitchRad: -0.24,
    base: { y: 0.39, z: 0.19, size: [0.08, 0.28, 0.095] },
    tip: { y: 0.484, z: 0.167, size: [0.061, 0.095, 0.071], color: '#494039' },
  },
} as const
