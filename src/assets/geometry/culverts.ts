// How the roads' culverts are drawn (`src/assets/culverts.ts`), as forest-road cross-drains are
// built. Lengths are metres.
// - An inlet outside the road's formation gets a dressed stone headwall across the pipe's line,
//   the pipe's dark mouth on the face the water meets. An inlet in a cut or on the road (a sag)
//   drains through a drop inlet instead: a stone catch basin flush with the ground and capped
//   with a dark grate, set at the nearest spot at least `dropClearM` off the carriageway, found
//   within `dropSearchM`.
// - The outlet headwall stands where the pipe leaves the fill: walking from the inlet along the
//   pipe's line, the first spot `clearOfRoadM` clear of the formation where the grading moved the
//   ground less than `toeM`. Below it lies a packed riprap apron, `lengthDiameters` pipe diameters
//   long, widening from `widthM[0]` to `widthM[1]`, so the water doesn't scour the bank.
// - Ends closer than `shareM` share one structure.
export const culvertModel = {
  headwall: { widthM: 1.5, heightM: 0.5, thicknessM: 0.3, embedM: 0.3, tone: [0.78, 0.76, 0.72] },
  pipe: { radiusM: 0.22, sides: 12, centreM: 0.26, proudM: 0.01, shade: 0.07 },
  dropInlet: { sizeM: 0.9, depthM: 0.6, riseM: 0.04, grateInset: 0.15, grateShade: 0.1 },
  dropClearM: 0.3,
  dropSearchM: 4,
  dropDirections: 16,
  apron: { lengthDiameters: 5, widthM: [1.2, 2.4], rowM: 0.38, stoneM: [0.32, 0.46], jitter: 0.3, heightShare: 0.45, sides: [5, 8], shoulder: 0.55, tone: [0.7, 0.68, 0.64] },
  clearOfRoadM: 0.5,
  toeM: 0.05,
  searchStepM: 0.5,
  searchM: 12,
  shareM: 1.5,
  repeatsPerMetre: 1.6,
  seed: 4417,
} as const
