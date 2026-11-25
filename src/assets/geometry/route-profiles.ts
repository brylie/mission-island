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

// A graded dirt road's ribbon: points across the road, as shares of half its width, so the
// ribbon follows the crown. The gravel finish is tinted toward packed earth, darker in the two
// wheel ruts (the lanes at `ruts`) and at the edges where loose stone gathers. Past the edges the
// ribbon carries on over the shoulders as a `verge` of soil and stone. The ribbon floats `lift`
// metres over the graded ground.
export const dirtRoadModel = {
  lanes: [-1, -0.8, -0.66, -0.55, -0.44, -0.2, 0, 0.2, 0.44, 0.55, 0.66, 0.8, 1],
  ruts: 0.55,
  lift: 0.07,
  tint: { crown: [0.86, 0.76, 0.62], rut: [0.58, 0.48, 0.38], edge: [0.78, 0.71, 0.6], verge: [0.56, 0.5, 0.38] },
} as const

// The road network's surface: one mesh over every road's formation, paved and graded, traced on a
// `cellM` grid and floating `lift` metres over the ground. The gravel finish repeats `uvPerMetre`
// times a metre, finer than a footpath's, so its stones read as a thin wearing course, and a
// coarser, turned second sample (`breakup`) keeps that repeat from showing. Edges between asphalt,
// shoulder, earth and verge are softened over `edgeSoftM`. Ruts lie at `dirtRoadModel.ruts` of the
// half-width, `rutWidth` wide in half-widths, and fade out over `rutFadeM` toward a junction,
// where traffic spreads. A short skirt hangs `skirtDropM` below every outer edge, `skirtOutM` outward,
// as a lip over the edge. The terrain itself is cut to the road's outline (`clipOutsideRoads`),
// `terrainTuckM` inside it, so its edge sits under the road at its true height and no crack opens
// between them.
export const roadSurfaceModel = {
  lift: dirtRoadModel.lift,
  cellM: 0.5,
  uvPerMetre: 2.5,
  breakup: { repeatsPerMetre: 0.37, turn: 0.6, strength: [0.25, 0.6] },
  edgeSoftM: 0.08,
  rutWidth: 0.07,
  rutStrength: 0.85,
  rutFadeM: [5, 14],
  skirtDropM: 0.12,
  skirtOutM: 0.05,
  terrainTuckM: 0.25,
  asphalt: { tint: [0.13, 0.15, 0.135], contrast: 0.12, speckleM: 0.09, patches: 0.14 },
  shoulder: { tint: [0.8, 0.78, 0.72] },
  tone: { broadM: 23, midM: 4.1, broad: 0.08, mid: 0.06 },
} as const
