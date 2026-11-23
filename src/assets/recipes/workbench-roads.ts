// The Workbench road designer's settings and look.

// Suggest route: a grade-limited search over the natural ground, then straightened, as
// roads are built: straight where the ground allows, curving only to follow contours or
// to switch back up a slope. It works on a `cellM` grid around the two dots plus
// `marginM`, judges grade on ground smoothed `smoothPasses` times, and keeps out of water
// shallower than `waterMarginM` above sea level. Grade within the limit costs only
// `gradeCostWeight` extra, so the search takes the short line rather than wandering for
// gentler ground. Each change of heading costs `turnCostM` metres at a right angle (more
// for sharper), so the path sweeps round bends a vehicle can take. The path is then
// pulled straight between points whenever the straight line holds the grade and turns no
// more than `straightenTurnRad` from the run before it, and thinned to dots no further apart
// than `maxDotSpacingM` and no closer than `minDotSpacingM`.
export const roadSuggestion = {
  cellM: 4,
  marginM: 120,
  smoothPasses: 5,
  gradeCostWeight: 2,
  // Over the grade limit each metre costs this many metres more per unit of excess grade, and
  // ground steeper than the limit times `hardGradeShare` is refused outright.
  overGradeWeight: 400,
  hardGradeShare: 1.6,
  turnCostM: 14,
  straightenTurnRad: 0.6,
  // A switchback: the search may turn back on itself in a hairpin of `radiusM`, coming back
  // twice that across the slope, for `costM` metres on top of the loop's length. A hairpin
  // is built ground, so its climb is judged over the loop, not as one steep step; it is
  // refused where the slope across it is steeper than `maxSlope`. Each leg between hairpins runs
  // at least `minLegM`. A hairpin sweeps through one of `sweepsDeg`: legs climbing across a slope
  // in mirror image meet at less or more than a straight about-turn. Its dots sit at `dotShares`
  // of the way round.
  hairpin: { radiusM: 12, costM: 40, maxSlope: 0.5, minLegM: 24, sweepsDeg: [135, 157.5, 180, 202.5, 225], dotShares: [0.25, 0.5, 0.75] },
  minDotSpacingM: 14,
  waterMarginM: 0.05,
  maxDotSpacingM: 40,
} as const

export const roadDesignerLook = {
  // Grade colours along a road: easy, steady, at the limit, and over it.
  grade: { easy: '#3fae5a', steady: '#d8c23a', limit: '#e98a2c', over: '#d63c3c', easyBelow: 0.06, steadyBelow: 0.1 },
  // Map strokes in screen pixels.
  road: { width: 4, selectedWidth: 6, outline: '#1c2622', outlineWidth: 8 },
  dot: { radius: 6, selectedRadius: 8, fill: '#fff7e0', stroke: '#1c2622', selectedFill: '#ffd166' },
  middle: { radius: 4, fill: '#c9e7ff', stroke: '#1c2622' },
  // How near, in screen pixels, a pointer must be to pick a dot or a stretch's middle.
  pickRadius: 12,
  // A pointer must move this far before a press becomes a drag.
  dragThreshold: 4,
  // Cut and fill deeper than this many metres is flagged.
  deepEarthworkM: 4,
  // The long section: canvas size, padding, and its colours.
  // Line widths of a disc's rim, the chart's ground and road lines, and where its labels sit.
  rimWidth: 1.5,
  chart: { width: 640, height: 150, padding: 22, groundWidth: 1.5, roadWidth: 2.5, labelInset: 2, labelDrop: 4, ground: '#7d8f6a', road: '#2c2c2c', cut: 'rgba(196, 120, 70, 0.35)', fill: 'rgba(80, 130, 200, 0.35)', marker: '#d63c3c' },
  // Warnings are listed at most this many to a road, and at most one per this many metres.
  maxWarnings: 12,
  warningSpacingM: 25,
} as const
