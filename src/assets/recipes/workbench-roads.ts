// The Workbench road designer's settings and look.

// Suggest route: a grade-limited search over the natural ground. It works on a
// `cellM` grid around the two dots plus `marginM`, judges grade on ground smoothed
// `smoothPasses` times, prefers gentler ground by `gradeCostWeight`, keeps out of
// water shallower than `waterMarginM` above sea level, then keeps dots that hold the
// path within `simplifyToleranceM` and no further apart than `maxDotSpacingM`.
export const roadSuggestion = {
  cellM: 4,
  marginM: 120,
  smoothPasses: 3,
  gradeCostWeight: 20,
  waterMarginM: 0.05,
  simplifyToleranceM: 5,
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
