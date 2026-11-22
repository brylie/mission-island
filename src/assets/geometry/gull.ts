type Point = readonly [x: number, y: number, z: number]
type Ellipsoid = readonly [x: number, y: number, z: number, diameterX: number, diameterY: number, diameterZ: number]
type Cylinder = readonly [x: number, y: number, z: number, diameterTop: number, diameterBottom: number, height: number, sides: number]

export const gullGeometry = {
  paint: {
    belly: '#f4e9d4',
    secondaryFeathers: '#b8c1bd',
    primaryFeathers: '#4b5558',
    skin: '#deaa57',
    eye: '#353b38',
  },
  body: {
    restingPivotY: 0.205,
    torso: { ellipsoid: [0, 0, 0, 0.26, 0.21, 0.52] satisfies Ellipsoid, segments: 8 },
    head: { ellipsoid: [0, 0.118, 0.207, 0.176, 0.185, 0.197] satisfies Ellipsoid, segments: 7 },
    throat: { ellipsoid: [0, 0.056, 0.159, 0.173, 0.21, 0.20] satisfies Ellipsoid, segments: 7 },
    bill: [0, 0.096, 0.337, 0.026, 0.079, 0.119, 6] satisfies Cylinder,
    eye: { x: 0.079, y: 0.144, z: 0.254, size: [0.028, 0.029, 0.032], segments: 6 },
    tail: [
      [-0.064, 0.012, -0.179],
      [0.063, 0.014, -0.181],
      [0.089, 0.012, -0.354],
      [0, 0.032, -0.397],
      [-0.089, 0.01, -0.354],
    ] satisfies readonly Point[],
  },
  featherFaces: [0, 1, 2, 0, 2, 3, 0, 3, 4],
  shoulder: {
    pivot: [0.082, 0.057, 0.065] satisfies Point,
    feathers: [
      [0, 0, 0.131],
      [0.29, 0.035, 0.106],
      [0.425, 0.02, 0.014],
      [0.307, -0.021, -0.15],
      [0, -0.038, -0.166],
    ] satisfies readonly Point[],
  },
  wingtip: {
    pivot: [0.318, 0.02, 0.026] satisfies Point,
    feathers: [
      [0, 0.017, 0.081],
      [0.232, 0.018, 0.049],
      [0.391, 0, -0.076],
      [0.245, -0.015, -0.106],
      [0, -0.039, -0.151],
    ] satisfies readonly Point[],
    whitePatch: { x: 0.237, y: 0.024, z: -0.018, size: [0.107, 0.012, 0.054], segments: 5 },
  },
  feet: {
    x: [-0.064, 0.064],
    leg: { y: 0.071, z: -0.019, topDiameter: 0.023, bottomDiameter: 0.025, height: 0.137, sides: 6 },
    toes: { y: 0.0155, z: 0.023, size: [0.079, 0.031, 0.117], segments: 6 },
  },
} as const
