export const auditionControls = {
  seed: { value: 1, min: 1, max: 9999, step: 1 },
  distance: [6, 0, 60, 1],
  breaker: [0.5, 0, 1, 0.05],
  spacing: [1, 0.6, 1.6, 0.05],
  pace: [8, 2, 12, 0.5],
  impact: [0.6, 0, 1, 0.05],
} as const

// Island sound families: the engine, wind, plant contact and birds, each with the traits a reviewer varies.
export const islandSoundControls = {
  seed: { value: 1, min: 1, max: 9999, step: 1 },
  distance: [8, 0, 60, 1],
  speed: [0, 0, 13, 0.5],
  effort: [0, 0, 1, 0.05],
  roughness: [0.5, 0, 1, 0.05],
  gust: [0.6, 0, 1, 0.05],
  exposure: [0.7, 0, 1, 0.05],
  contactSpeed: [4, 0.5, 8, 0.5],
  repeatSeconds: { foliage: 1.4, birds: 3.5 },
  scheduleAheadSeconds: 0.25,
  lateness: 2,
} as const
