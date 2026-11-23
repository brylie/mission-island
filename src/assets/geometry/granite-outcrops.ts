// Shapes of Highwood's granite outcrops and clitter boulders (granite-outcrops.ts).
// An outcrop is a stack of joint blocks: each a pillow-edged slab, long along the
// joint grain, the upper ones smaller and slipped a little. Clitter is a single
// rounder block. Sizes are metres; ranges are [least, most].

export const graniteOutcropShape = {
  outcrop: {
    slabs: [1, 3],
    widthM: [1.4, 3.2],
    // A lone slab is no wider than this, so its downhill face never reads as a pillar.
    loneWidthM: 2.4,
    // Length along the joint grain, as a multiple of the width.
    lengthRatio: [1.2, 2],
    slabHeightM: [0.45, 0.9],
    // Each slab up is this share of the one below, and slips up to `slip` of its width.
    shrink: [0.72, 0.95],
    slip: 0.3,
    // Turn from the joint grain, either way, in radians.
    twistRad: 0.16,
  },
  clitter: {
    widthM: [0.35, 1.3],
    lengthRatio: [1, 1.5],
    heightRatio: [0.45, 0.8],
  },
  // In plan each slab is a rectangle with its corners cut off: `cornerCut` is the share
  // of the half width each cut takes. `shoulder` is the share of the height (and of the
  // half width, inward) the bevel round the top takes. Corners move up to `cornerJitter`
  // of their distance from the centre; the top tilts up to `tiltM` across.
  cornerCut: { outcrop: 0.15, clitter: 0.4 },
  shoulder: { outcrop: 0.2, clitter: 0.35 },
  cornerJitter: { outcrop: 0.12, clitter: 0.22 },
  tiltM: { outcrop: 0.18, clitter: 0.18 },
  // An outcrop stands this share of the way from the lowest to the highest ground under
  // it, so its uphill side is buried and its downhill face isn't a tall wall.
  standShare: 0.42,
  embedM: { outcrop: 0.4, clitter: 0.15 },
} as const

// Colour multipliers over the granite recipe, matched to the terrain's granite
// (highwoodGranite.tint): weathered tops carry lichen, sides stay buff-grey.
export const graniteOutcropFinish = {
  top: [0.95, 0.93, 0.78],
  side: [1, 0.92, 0.78],
  // Each block's brightness varies up to this share either way.
  toneSpread: 0.07,
  // Crystals at the same size as the terrain's granite.
  repeatsPerMetre: 2.6,
  // Highwood's tile size: one merged mesh per tile, so off-screen tiles are culled.
  tileM: 64,
} as const
