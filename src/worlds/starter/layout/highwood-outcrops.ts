// Where Highwood's granite outcrops and clitter boulders stand (highwood-outcrops.ts).
// Outcrops rise from the bedrock the ground shader draws: ground steep enough for
// full rock cover and high enough to be granite. Clitter lies below them, downslope.

export const highwoodOutcropPlacement = {
  seed: 7213,
  // Each outcrop draws from its own random stream, seeded by a whole number below this,
  // so its shape doesn't change when an earlier candidate is kept or dropped.
  streamSeeds: 1e9,
  // One candidate per square cell this wide, moved up to `jitter` of a cell.
  cellM: 4,
  jitter: 0.8,
  // Slope is measured across twice this span, in metres.
  slopeSpanM: 2,
  // Bare-rock weight (from slope, as the terrain tiles reckon it) from which outcrops
  // can stand, and where they reach full chance.
  bedrockFrom: 0.62,
  bedrockFull: 0.86,
  // Chance a candidate on full bedrock grows an outcrop, before clustering.
  outcropChance: 0.8,
  // Outcrops gather in groups along a face, not evenly: a smooth noise this wide in
  // metres must climb from `from` to `full` for the full chance.
  cluster: { wavelength: 48, octaves: 2, lacunarity: 2, gain: 0.5, from: 0.38, full: 0.62 },
  // Tors also stand on crests, whatever the slope: granite ground no more than `toleranceM`
  // below the highest ground `radiusM` round it, at `chance` per candidate, with 2–3 slabs.
  crest: { radiusM: 6, toleranceM: 0.3, chance: 0.35, slabs: [2, 3] },
  // Tors on Cairn Summit's brow: within `reachM` of the crown and no more than `dropM`
  // below it, at `chance` per candidate, so a few break the dome's skyline.
  brow: { reachM: 40, dropM: 9, chance: 0.25 },
  // No rock stands within `crownM` of Cairn Summit's crown, where people stand at the top,
  // or within `padM` of the summit spur's end, the turning pad by the summit.
  keepClear: { crownM: 10, padM: 15 },
  // Under an outcrop the ground may fall at most this many times the stack's height below
  // its base, so a crag's downhill face stays a stepped stack, not a pillar; steeper spots
  // stay bare rock.
  faceRatio: 1.3,
  // Crags on ground steeper than full bedrock: 1–2 slabs, long along the contour (length as
  // a multiple of width), an upper slab nearly as big as the one below and slipped `slip`
  // of its width along the contour or into the slope, so it never sits centred like a cairn.
  // Their width runs down the slope, so it is kept to `widthM`, and they don't twist off the contour.
  // Their foot is sunk deeper downhill, so they may stand on ground falling `faceRatio` times their height.
  steep: { slabs: [1, 2], widthM: [1.2, 2.4], lengthRatio: [1.8, 2.8], shrink: [0.85, 1], slip: [0.3, 0.45], twistRad: 0, faceRatio: 1.8 },
  // Clitter per outcrop, and how far below it, in metres; it spreads up to
  // `spreadRad` either side of straight downslope.
  // Each boulder then slides downhill in `slideStepM` steps, up to `slideMaxM`, until the
  // ground is no steeper than `reposeSlope` (rise per metre), where loose blocks come to rest.
  clitter: { min: 1, max: 4, nearM: 2.5, farM: 9, spreadRad: 0.7, reposeSlope: 0.7, slideStepM: 1, slideMaxM: 24 },
  // Distances in metres from a rock's farthest corner: to a route's centreline, a trunk or
  // fallen log, and another rock.
  routeClearanceM: 4,
  trunkClearanceM: 1.6,
  gapM: 0.4,
} as const
