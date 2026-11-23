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
  minDotSpacingM: 14,
  waterMarginM: 0.05,
  maxDotSpacingM: 40,
} as const

export const roadDesignerLook = {
  // Grade colours along a road: easy (under `easyBelow`), steady, near the stretch's own limit
  // (from `nearLimitShare` of it), and over it, which is also drawn dashed so it reads without colour.
  grade: { easy: '#3fae5a', steady: '#d8c23a', limit: '#e98a2c', over: '#d63c3c', easyBelow: 0.06, nearLimitShare: 0.8 },
  // Map strokes in screen pixels; an over-limit stretch is dashed `overDash` on and off.
  road: { width: 4, selectedWidth: 6, outline: '#1c2622', outlineWidth: 8, overDash: [7, 5] },
  dot: { radius: 4.5, selectedRadius: 6.5, fill: '#fff7e0', stroke: '#1c2622', selectedFill: '#ffd166' },
  middle: { radius: 3, fill: '#c9e7ff', stroke: '#1c2622' },
  // The spot a warning or the long section points at: a white ring over a dark one, unlike any grade colour.
  marker: { radius: 9, width: 3, color: '#ffffff', outline: '#1c2622', outlineWidth: 6 },
  // Arrow keys pan the map by this share of its width; + and − zoom by `zoomStep`.
  keyPanShare: 0.1,
  zoomStep: 1.25,
  // How near, in screen pixels, a pointer must be to pick a dot or a stretch's middle.
  pickRadius: 12,
  // A pointer must move this far before a press becomes a drag.
  dragThreshold: 4,
  // Cut and fill deeper than this many metres is flagged.
  deepEarthworkM: 4,
  // The long section: canvas size, padding, and its colours.
  // Line widths of a disc's rim, the chart's ground and road lines, and where its labels sit.
  rimWidth: 1.5,
  // Ground is a brown line, not green, because green on the map means an easy grade.
  chart: { width: 640, height: 150, padding: 22, groundWidth: 2.5, roadWidth: 2.5, labelInset: 2, labelDrop: 4, ground: '#7a5230', road: '#1f1f1f', cut: 'rgba(214, 120, 50, 0.6)', fill: 'rgba(60, 120, 210, 0.55)', marker: '#1f1f1f', markerWidth: 1.5 },
  // Warnings are listed at most this many to a road, and at most one per this many metres.
  maxWarnings: 12,
  warningSpacingM: 25,
} as const
