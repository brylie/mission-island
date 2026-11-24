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
    lengthRatio: [1.1, 1.6],
    // A block's height is this share of its mean width and length, as Dartmoor's woolsacks
    // are about a third as tall as they are broad, kept within `heightM` so each step up stays one a walker can
    // jump. The same rule holds for a steep face's crags.
    heightRatio: [0.36, 0.5],
    heightM: [0.45, 1.3],
    // Each block up is this share of the one below in width and, separately, in length:
    // some grow, so a stack never tapers like a pyramid. It slips `slip` of the lower
    // block's length along the grain, either way, and up to `slipAcross` of its width across.
    resize: [0.65, 1.15],
    slip: [0.2, 0.4],
    slipAcross: 0.12,
    // Turn from the joint grain, either way, in radians.
    twistRad: 0.16,
  },
  // A block's centre stays within this share of the lower block's half length and half
  // width, so it rests on it, though its far end may overhang.
  supportShare: 0.8,
  // Upper blocks sit this share of their height down into the block below, closing the
  // gap between a rounded top and a rounded underside into a horizontal joint.
  sinkShare: 0.14,
  // A boulder left perched on a tor of fewer than `belowSlabs` blocks, at `chance` per tor
  // on crests and the brow and `slopeChance` elsewhere. It rests toward one end of the top
  // block, `alongShare` of its half length from the middle, never centred like a finial.
  // Its width is a share of the top block's, up to `maxWidthM` so it stays a step a walker
  // can still climb, its length a multiple of its width and its height a share of its width.
  perch: { chance: 0.45, slopeChance: 0.15, belowSlabs: 3, alongShare: [0.25, 0.45], widthShare: [0.38, 0.62], maxWidthM: 1.5, lengthRatio: [1, 1.35], heightRatio: [0.55, 0.8] },
  clitter: {
    widthM: [0.35, 1.3],
    lengthRatio: [1, 1.5],
    heightRatio: [0.45, 0.8],
  },
  // Each block leans by up to this much rise per metre along and across it, so blocks
  // don't all lie dead level; boulders, loose or perched, lean further.
  tilt: { block: 0.12, boulder: 0.22 },
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
    block: [[0, 0.66], [0.12, 0.86], [0.32, 0.95], [0.6, 1], [0.82, 0.92], [0.95, 0.72]],
    boulder: [[0, 0.62], [0.28, 0.95], [0.6, 0.96], [0.84, 0.7], [0.95, 0.38]],
  },
  // Superellipse exponent in plan: 2 is an ellipse, higher is squarer with rounded corners.
  squareness: { block: [3.2, 4.2], boulder: [2, 2.6] },
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
  // A lowest block skips its pinched first ring, and a lowest block or boulder spreads from
  // its lowest ring to this share of its half size where it meets the ground. A block's
  // foot reaches past its widest ring, so a downhill face slopes out into the hill instead
  // of standing as a stem under a cap.
  footRadius: { block: 1.04, boulder: 0.8 },
  // Below a lowest block the face down to the ground is cut into a step every `stepM`
  // metres, at most `maxSteps`. Each step's ring holds back up to `jitter` of its share
  // of the flare, so the steps are uneven but each still reaches out past the one above.
  skirt: { stepM: 0.6, maxSteps: 4, jitter: 0.8 },
} as const

// Colour multipliers over the granite recipe, matched to the terrain's granite
// (highwoodGranite.tint): weathered tops carry lichen, sides stay buff-grey.
export const graniteOutcropFinish = {
  top: [0.95, 0.93, 0.78],
  // Sides a little darker than the terrain's granite, so a block stands off the hill.
  side: [0.81, 0.75, 0.63],
  // A facet whose upward normal is at least this share of its length is lit as a top.
  topNormalY: 0.62,
  // Each block's brightness varies up to this share either way.
  toneSpread: 0.07,
  // Crystals at the same size as the terrain's granite.
  repeatsPerMetre: 2.6,
  // Highwood's tile size: one merged mesh per tile, so off-screen tiles are culled.
  tileM: 64,
} as const
