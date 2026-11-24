// The island's kinds of road, and how roads are fitted to the ground. Widths and slopes are
// metres. Grades are rise per metre of horizontal run. Batter slopes are horizontal metres per
// metre of height: a cut bank at 1 means 1 horizontal : 1 vertical, a fill at 1.5 means 1.5
// horizontal : 1 vertical (about 34 degrees), as earthworks on firm ground are commonly built.
// `rockCutSlope` is the steepest a cut may stand where a hillside is too steep for a soil cut to
// meet it. `minTurnRadiusM` is the tightest bend the Fire and Rescue pickup turns without
// shunting. `crown` is how far the road's centre stands above its edges. Graded kinds are cut
// and filled into the island; paved roads are the village's, laid on the ground as it is.
export const roadKinds = {
  'fire-road': { width: 4, shoulderWidth: 1, maxGrade: 0.12, minTurnRadiusM: 8, cutSlope: 1, fillSlope: 1.5, rockCutSlope: 0.25, crown: 0.05, surface: 'earth', graded: true },
  'track': { width: 3, shoulderWidth: 0.6, maxGrade: 0.16, minTurnRadiusM: 6, cutSlope: 1, fillSlope: 1.5, rockCutSlope: 0.25, crown: 0.03, surface: 'earth', graded: true },
  'paved': { width: 6, shoulderWidth: 0.7, maxGrade: 0.1, minTurnRadiusM: 8, cutSlope: 1, fillSlope: 1.5, rockCutSlope: 0.25, crown: 0, surface: 'asphalt', graded: false },
} as const

export type RoadKind = keyof typeof roadKinds
// The kinds the road designer lays and the Workbench saves.
export const gradedRoadKinds = ['fire-road', 'track'] as const satisfies readonly RoadKind[]

// How a road finds its height. The road is sampled every `sampleStepM` along its centreline. Its
// ground is averaged across the road's width, smoothed over `groundSmoothM`, then held within the
// grade limit by forward and backward passes, smoothing over `passSmoothM` between them. On a
// side slope the road benches into the hill, blending in from `benchBlend.from` of the bench slope
// to fully benched `benchBlend.span` of it above that.
export const roadProfileSolver = { sampleStepM: 1, groundSmoothM: 20, passSmoothM: 6, passes: 6, benchBlend: { from: 0.75, span: 0.5 } } as const

// How roads meet each other and the ground.
// - A road end within its host's carriageway joins that road (a junction).
// - `mouthBlendM`: over this many metres from the host's edge a branch's surface warps from
//   the host's surface to its own, so the mouth meets the host without a step.
// - `filletM`: the blend distance of the smooth union that rounds a junction's corners into a
//   bell-mouth (a fillet radius of about 0.6 of it).
// - `reachM`: how far from a formation edge a bank may run before it must have met the ground.
// - `cellM`: the grading raster's cell; `tileCells` cells to a raster tile.
// - `apronM`: how far a road joining a paved one is paved itself, as an apron at the mouth.
// - `tileKeyStride`: a raster tile's key packs its column and row as column × stride + row, so
//   rows must stay within half the stride of zero: 2^19 tiles (over 8,000 km) each way.
// - `benchSideSlope`: side slopes steeper than this (rise per run across the road) bench the
//   road into the hill, so no fill hangs off the downhill side.
export const roadNetwork = { mouthBlendM: 8, filletM: 8, reachM: 18, cellM: 1, tileCells: 16, tileKeyStride: 1_048_576, benchSideSlope: 0.6, apronM: 6 } as const

// Where water would stand on or beside a road, a culvert takes it away. Hollows are looked for
// wherever the grading moved the ground, testing neighbours `stepM` away; hollows closer than
// `groupM` share one culvert, at the lowest. Its outlet is followed down the natural ground, up
// to `outletSteps` steps, to where the grading changes the ground by less than `sinkM`; a sag in a
// cut with no way down runs its pipe to the nearest lower ground within `pipeReachM`.
export const roadDrainage = { stepM: 1, groupM: 12, sinkM: 0.05, outletSteps: 150, pipeReachM: 40 } as const
