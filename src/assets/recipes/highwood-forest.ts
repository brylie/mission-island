// How Highwood's forest is drawn. Distances are metres from the camera to the
// nearest point of a tile. Inside `nearM` a tile's trees use the detailed (near) templates
// as thin instances; beyond it they use merged far silhouettes. A tile switches
// back only after the camera passes `bandM` further, so trees at the boundary
// don't flicker between tiers. Understory plants draw only inside `understoryM`.
export const highwoodForestLook = {
  tileM: 64,
  nearM: 80,
  bandM: 16,
  understoryM: 45,
  understoryBandM: 10,
  // Plants sink this far below the lowest ground under their base, so no base shows a gap.
  sinkM: 0.08,
  // A plant's base is a share of its collision radius: a trunk's or snag's whole girth, the
  // `baseShare` of a shrub's spread its lowest clumps rest on, and a frond's single crown. The
  // ground is sampled in `directions` round it. A trunk stands upright on the lowest of it, so its
  // downhill side never hangs in the air. A shrub is sheared to lie on the slope as heather does,
  // its stems upright, its base on the plane through that ground. A log follows its length.
  // A shrub leans with the slope only up to `maxShear` (rise per metre), past which it would
  // stretch into a slab; on steeper ground its uphill side runs into the hill. A low mat (under
  // `matHeightM`, heather and bilberry) holds steep banks and barely shows being buried, so it
  // stays; a taller shrub whose base would be buried deeper than `shrubBuryM` is left out.
  seat: { directions: 16, baseShare: { tree: 1, snag: 1, mound: 0.75, fronds: 0, log: 0 }, maxShear: 0.7, shrubBuryM: 0.35, matHeightM: 0.6 },
} as const
