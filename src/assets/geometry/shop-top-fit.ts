type HemRow = readonly [rise: number, z: number, coatHalfWidth: number, shirtHalfWidth: number, halfDepth: number, pigment?: 'detail']
type BodyRow = readonly [y: number, z: number, halfWidth: number, halfDepth: number, pigment?: 'detail' | 'beaconStripe']
type ShoulderRow = readonly [y: number, z: number, sleeveHalfWidth: number, vestHalfWidth: number, halfDepth: number]
type SleeveRow = readonly [y: number, x: number, z: number, halfWidth: number, halfDepth: number, pigment?: 'cuff']

export const shopTopFit = {
  body: {
    sides: 32,
    neckOpening: 0.056,
    panelProbeDepth: 0.16,
    hem: {
      coatHeight: 0.719,
      shirtHeight: 0.778,
      rows: [
        [0, 0.002, 0.311, 0.281, 0.193, 'detail'],
        [0.010, 0.002, 0.313, 0.287, 0.199, 'detail'],
        [0.044, 0, 0.309, 0.288, 0.200, 'detail'],
        [0.048, 0, 0.308, 0.289, 0.201],
      ] satisfies readonly HemRow[],
    },
    torso: [
      [0.891, -0.002, 0.284, 0.191],
      [0.928, -0.004, 0.274, 0.184, 'beaconStripe'],
      [0.963, -0.006, 0.272, 0.185, 'beaconStripe'],
      [0.968, -0.006, 0.272, 0.185],
      [1.022, -0.008, 0.276, 0.189],
      [1.027, -0.008, 0.276, 0.189, 'beaconStripe'],
      [1.058, -0.010, 0.279, 0.192, 'beaconStripe'],
      [1.063, -0.010, 0.279, 0.192],
      [1.160, -0.012, 0.291, 0.182],
    ] satisfies readonly BodyRow[],
    shoulders: [
      [1.213, -0.010, 0.286, 0.260, 0.166],
      [1.252, -0.008, 0.240, 0.200, 0.146],
    ] satisfies readonly ShoulderRow[],
    neckline: [
      [1.267, 0.001, 0.158, 0.122, 'detail'],
      [1.282, 0.001, 0.134, 0.114, 'detail'],
    ] satisfies readonly BodyRow[],
  },
  gingham: {
    rowCuts: { startY: 0.828, stopY: 1.26 },
    print: { bottomY: 0.828, topY: 1.252 },
    stripeHeight: 0.044,
    inkPerStripe: 0.35,
  },
  // X is authored for the positive-X arm before mirroring.
  sleeve: [
    [-0.459, 0.090, -0.001, 0.069, 0.077, 'cuff'],
    [-0.452, 0.091, -0.002, 0.077, 0.083, 'cuff'],
    [-0.396, 0.080, -0.007, 0.079, 0.089, 'cuff'],
    [-0.391, 0.079, -0.008, 0.084, 0.092],
    [-0.287, 0.053, -0.015, 0.087, 0.097],
    [-0.185, 0.032, -0.019, 0.099, 0.105],
    [-0.090, -0.009, -0.030, 0.105, 0.122],
    [-0.009, -0.045, -0.034, 0.107, 0.124],
    [0.040, -0.086, -0.030, 0.092, 0.104],
    [0.071, -0.149, -0.028, 0.047, 0.057],
  ] satisfies readonly SleeveRow[],
} as const
