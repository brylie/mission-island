// The island's breeze, shared by the windblown particles and the wind sounds.
export const islandBreeze = {
  gust: { floor: 0.25, swing: 0.75, rate: 0.62, sharpness: 2, rainLoss: 0.62 },
  // Over a minute or two the breeze comes and goes. Unrelated slow waves keep the pattern from repeating;
  // the floor keeps a breath of air in a lull.
  lull: {
    floor: 0.12,
    waves: [
      { rate: 0.071, weight: 0.55, phase: 0 },
      { rate: 0.0437, weight: 0.3, phase: 1.3 },
      { rate: 0.113, weight: 0.15, phase: 2.1 },
    ],
  },
} as const
