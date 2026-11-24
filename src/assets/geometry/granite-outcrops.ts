// Shapes of Highwood's granite outcrops and clitter boulders (highwood-outcrops.ts lays
// them out, granite-blocks.ts shapes them). An outcrop is a stack of woolsacks: joint
// blocks whose corners weathered round first, long along the joint grain, stacked
// off-centre and sometimes topped by a perched boulder. Clitter is a single rounder
// boulder. Sizes are metres; ranges are [least, most].

export const graniteOutcropShape = {
  outcrop: {
    slabs: [1, 3],
    widthM: [1.2, 2.7],
    // A lone block is no wider than this, so its downhill face never reads as a pillar.
    loneWidthM: 2.4,
    // Length along the joint grain, as a multiple of the width.
    lengthRatio: [1.2, 2],
    slabHeightM: [0.5, 0.95],
    // Each block up is this share of the one below in width and, separately, in length:
    // some grow, so a stack never tapers like a pyramid. It slips `slip` of the lower
    // block's length along the grain, either way, and up to `slipAcross` of its width across.
    resize: [0.72, 1.08],
    slip: [0.1, 0.28],
    slipAcross: 0.12,
    // Turn from the joint grain, either way, in radians.
    twistRad: 0.16,
  },
  // A block's centre stays within this share of the lower block's half length and half
  // width, so it rests on it, though its far end may overhang.
  supportShare: 0.62,
  // Upper blocks sit this share of their height down into the block below, closing the
  // gap between a rounded top and a rounded underside into a horizontal joint.
  sinkShare: 0.14,
  // A boulder left perched on a tor, at `chance` per tor on crests and the brow and
  // `slopeChance` elsewhere; its width is a share of the top block's, up to `maxWidthM`
  // so it stays a step a walker can still climb, its length a multiple of its width and
  // its height a share of its width.
  perch: { chance: 0.45, slopeChance: 0.15, widthShare: [0.38, 0.62], maxWidthM: 1.5, lengthRatio: [1, 1.35], heightRatio: [0.55, 0.8] },
  clitter: {
    widthM: [0.35, 1.3],
    lengthRatio: [1, 1.5],
    heightRatio: [0.45, 0.8],
  },
  // Each block's top leans up to `tiltM` across it, so blocks don't all lie dead level.
  tiltM: { outcrop: 0.18, clitter: 0.22 },
  // An outcrop stands this share of the way from the lowest to the highest ground under
  // it, so its uphill side is buried and its downhill face isn't a tall wall, but never
  // with more than `1 - shoulderShare` of its foot block's height below the highest ground.
  standShare: 0.42,
  shoulderShare: 0.3,
  embedM: { outcrop: 0.4, clitter: 0.15 },
} as const

// How a woolsack is built (granite-blocks.ts): rings from the foot up, each a superellipse
// in plan, bent by a few slow waves and a little jitter, then capped by a low dome.
// A `block` is a joint block; a `boulder` is rounder, for clitter and perched stones.
export const graniteBlockForm = {
  // Points round each ring.
  sides: { block: 10, boulder: 8 },
  // Rings as [share of the height, share of the half length and half width]. The block
  // bulges at mid height and rounds off above and below; the crown dome closes the top.
  rings: {
    block: [[0, 0.82], [0.16, 0.95], [0.48, 1], [0.8, 0.93], [0.95, 0.74]],
    boulder: [[0, 0.62], [0.28, 0.95], [0.6, 0.96], [0.84, 0.7], [0.95, 0.38]],
  },
  // Superellipse exponent in plan: 2 is an ellipse, higher is squarer with rounded corners.
  squareness: { block: [2.6, 3.6], boulder: [2, 2.6] },
  // Each ring's size varies up to this share either way.
  ringJitter: 0.02,
  // Slow waves round each ring: `lobes` bumps per turn, `share` of the radius, their phase
  // drifting up to `driftRad` from foot to crown so the bumps twist rather than extrude.
  waves: [
    { lobes: 2, share: 0.06, driftRad: 1.2 },
    { lobes: 3, share: 0.045, driftRad: 1.8 },
  ],
  // Each point moves up to this share of its radius either way.
  jitter: 0.04,
  // The crown sags up to this share of the height toward one side, unevenly.
  crownSag: 0.1,
  // A lowest block's foot spreads this much wider than its lowest ring where it meets the
  // ground, so a downhill face slopes out into the hill instead of standing as a wall.
  footFlare: 1.3,
  // Below a lowest block the face down to the ground is cut into a step every `stepM`
  // metres, at most `maxSteps`. Each step's ring holds back up to `jitter` of its share
  // of the flare, so the steps are uneven but each still reaches out past the one above.
  skirt: { stepM: 0.6, maxSteps: 4, jitter: 0.8 },
} as const

// Colour multipliers over the granite recipe, matched to the terrain's granite
// (highwoodGranite.tint): weathered tops carry lichen, sides stay buff-grey.
export const graniteOutcropFinish = {
  top: [0.95, 0.93, 0.78],
  side: [0.92, 0.85, 0.72],
  // A facet whose upward normal is at least this share of its length is lit as a top.
  topNormalY: 0.62,
  // Each block's brightness varies up to this share either way.
  toneSpread: 0.07,
  // Crystals at the same size as the terrain's granite.
  repeatsPerMetre: 2.6,
  // Highwood's tile size: one merged mesh per tile, so off-screen tiles are culled.
  tileM: 64,
} as const
