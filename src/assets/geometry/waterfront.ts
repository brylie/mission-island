export const harborDockGeometry = {
  planks: 18,
  spacing: 0.49,
  width: 3.45,
  plankDepth: 0.45,
  plankThickness: 0.2,
  top: 0.23,
} as const

export const harborDockPile = {
  bottom: -1.545,
  top: 0.705,
  diameter: 0.43,
  sides: 7,
}

export const dockDeckModel = {
  // Nail rows run down the two main timber beams.
  beamOffset: 1.34,
  beam: { drop: 0.31, width: 0.19, height: 0.25 },
  plankVariation: { seed: 931, sway: 0.04, grainPhase: 1.7 },
  nail: { rise: 0.002, z: 0.065, size: [0.035, 0.008, 0.035], yawSpread: 0.8, color: '#584e40' },
} as const

export const dockPileBarnacles = {
  crossSections: 5,
  startFace: { port: 2, starboard: -1 },
  surfaceGap: 0.003,
  tideBand: { below: 0.055, above: 0.085, irregularity: 0.10, seed: 409 },
  textureStep: 0.19,
} as const

export const harborSkiff = {
  outline: [
    [-0.9, -2.32],
    [0.9, -2.32],
    [1.14, -1.18],
    [1.14, 0.45],
    [0.81, 1.57],
    [0.29, 2.44],
    [0, 2.75],
    [-0.29, 2.44],
    [-0.81, 1.57],
    [-1.14, 0.45],
    [-1.14, -1.18],
  ] satisfies readonly (readonly [x: number, z: number])[],
  rim: { baseY: 0.4, bowRise: 0.075 },
  outer: { floorY: -0.44, bowLift: 0.09, widthRatio: 0.72, lengthRatio: 0.94, color: '#eee8cc' },
  floor: { y: 0.073, widthRatio: 0.71, lengthRatio: 0.92, color: '#8b9b87' },
  inner: { widthRatio: 0.91, lengthRatio: 0.96, rimDrop: 0.022, color: '#6e9290' },
  gunwale: {
    color: '#c4935c',
    // Top outer, top inner, bottom outer, bottom inner.
    section: [
      { widthRatio: 1.042, height: 0.034, lengthRatio: 1.02, grainOffset: 0 },
      { widthRatio: 0.895, height: 0.034, lengthRatio: 0.95, grainOffset: 0.2 },
      { widthRatio: 1.028, height: -0.05, lengthRatio: 1.02, grainOffset: -0.1 },
      { widthRatio: 0.905, height: -0.05, lengthRatio: 0.95, grainOffset: 0.3 },
    ],
  },
  // Each bench spans the inside of the hull at its station, measured at its top
  // edge, and stops short of the lining by `clearance`.
  thwart: {
    y: 0.19,
    height: 0.12,
    depth: 0.44,
    clearance: 0.015,
    stations: [-1.3, 0.25, 1.42],
  },
  outboard: {
    leg: { y: 0.29, z: -2.34, size: [0.39, 0.62, 0.28], color: '#36484a' },
    cowl: { y: 0.62, z: -2.37, size: [0.51, 0.35, 0.43], color: '#c96948' },
  },
} as const

export const harborBuoy = {
  float: { y: 0.03, size: [0.92, 0.58, 0.92], color: '#d98545' },
  band: { y: 0.08, diameter: 0.87, height: 0.08, sides: 16, color: '#fae4b3' },
  tab: { y: 0.34, size: [0.13, 0.23, 0.13], color: '#f4c66e' },
} as const
