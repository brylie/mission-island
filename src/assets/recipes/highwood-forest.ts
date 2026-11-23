// How Highwood's forest is drawn. Distances are metres from the camera to a
// tile's centre. Inside `nearM` a tile's trees use the detailed (near) templates
// as thin instances; beyond it they use merged far silhouettes. A tile switches
// back only after the camera passes `bandM` further, so trees at the boundary
// don't flicker between tiers. Understory plants draw only inside `understoryM`.
export const highwoodForestLook = {
  tileM: 64,
  nearM: 110,
  bandM: 16,
  understoryM: 60,
  understoryBandM: 10,
  // Trunks sink this far so a base on a slope never shows a gap underneath.
  sinkM: 0.08,
} as const
