// Where each footstep surface begins on Starter Island, in metres unless noted.
export const groundSurfaces = {
  roadHalfWidthMetres: 3.3,
  // Wading water splashes from ankle deep up to the depth where a crewmate starts to swim.
  shallows: { minDepthMetres: 0.04, maxDepthMetres: 0.9 },
  // Leaf litter under trees: within a wooded region, or with enough trunks close by.
  // In Highwood, wherever the baked needle-litter cover passes `highwoodCover`.
  litter: { treeReachMetres: 5.5, nearbyTrees: 2, highwoodCover: 0.5 },
  // Rain soaks grass and earth first; the wet-sand band is damp in any weather.
  // The beach's own wetness, from the waterline up, decides where sand stays damp in dry weather.
  damp: { rain: 0.35, pavingRain: 0.55, wetSand: 0.5 },
} as const
