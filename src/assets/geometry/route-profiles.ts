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

// The road network's surface: ribbons and junction patches float `lift` metres over the graded
// ground. Patches are traced on a `patchCellM` grid over the ground no ribbon covers. The finish
// repeats `uvPerMetre` times a metre, finer than a footpath's, so its stones read as a thin
// wearing course. Terrain under a road's formation is sunk `terrainSinkM` out of sight, so the
// terrain mesh's coarser triangles never poke through the road's edge where a bank rises. A
// junction patch tucks `patchTuckM` under the ribbons it meets, `patchDropM` lower, so the ribbon
// draws on top where they overlap and no hairline crack shows where their edges meet. Patch
// triangles smaller than `patchMinAreaM2` are left out: slivers that thin shade black.
export const roadSurfaceModel = { lift: dirtRoadModel.lift, patchCellM: 0.5, uvPerMetre: 2.5, terrainSinkM: 0.4, patchTuckM: 0.15, patchDropM: 0.02, patchMinAreaM2: 0.0001 } as const
