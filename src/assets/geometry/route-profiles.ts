// Visible surface offsets in metres. Wheel contact uses the same profiles as the meshes.
export const roadSurface = { width: 6, shoulderWidth: 1.4, shoulder: 0.056, asphalt: 0.084 } as const
export const sidewalkLift = 0.065
export const trailLift = 0.039

export const laneMarkingModel = {
  dashes: { lead: 2, endClearance: 2, spacing: 4.2, length: 1.65 },
  width: 0.17,
  y: 0.099,
  color: '#e0cd9f',
} as const

export const roadFinish = {
  gravelTile: 2.05,
  asphaltTile: 3.0,
  asphalt: '#636d65',
  lineTile: 2.5,
  pavingTile: 2,
  gravelPathTile: 1.85,
} as const

export const gravelTrailModel = {
  lanes: [-1, -0.83, 0, 0.83, 1],
  startTaper: 0.65,
  endTaper: 0.80,
  edgeSine: { amplitude: 0.075, rate: 2.3 },
  edgeCosine: { amplitude: 0.045, rate: 4.1 },
  widthMinimum: 0.78,
  widthRamp: 0.22,
  tint: { green: 0.98, blue: 0.95, blueEdgeLoss: 0.07 },
} as const

export const wornTrailModel = {
  lanes: [-1, -0.52, 0, 0.52, 1],
  startTaper: 1.1,
  endTaper: 1.5,
  edgeSine: { amplitude: 0.17, rate: 1.35, phase: 1.7 },
  edgeCosine: { amplitude: 0.08, rate: 3.9 },
  widthMinimum: 0.58,
  widthRamp: 0.42,
  sway: { amplitude: 0.10, rate: 1.12 },
  lift: 0.018,
  sandFade: { start: 0.12, span: 0.45 },
  wear: { base: 0.77, slow: { amplitude: 0.13, rate: 1.84 }, fast: { amplitude: 0.09, rate: 5.52 } },
  color: [0.58, 0.46, 0.29],
  opacityEdgeCurve: 1.6,
} as const

// Graded roads: kinds of road the road designer lays and the terrain is cut and filled for.
// Widths and slopes are metres; grades are rise per metre along the road. Batter slopes are
// horizontal metres per metre of height: a cut bank 1:1, a fill embankment 1:1.5, as earthworks
// on firm ground are commonly built. `minTurnRadiusM` is the tightest bend the Fire and Rescue
// pickup turns without shunting.
export const roadKinds = {
  'fire-road': { width: 4, shoulderWidth: 1, maxGrade: 0.12, minTurnRadiusM: 8, cutSlope: 1, fillSlope: 1.5, crown: 0.05 },
  'track': { width: 3, shoulderWidth: 0.6, maxGrade: 0.16, minTurnRadiusM: 6, cutSlope: 1, fillSlope: 1.5, crown: 0.03 },
} as const

// How a road finds its height. The road is sampled every `sampleStepM` along its centreline. Its
// ground is averaged across the road's width, smoothed over `groundSmoothM`, then held within the
// grade limit by forward and backward passes, smoothing over `passSmoothM` between them.
export const roadProfileSolver = { sampleStepM: 1, groundSmoothM: 20, passSmoothM: 6, passes: 6 } as const
