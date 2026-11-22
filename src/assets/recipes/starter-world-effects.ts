export const starterPlaceLooks = {
  waterfall: { range: 40, tuning: { strength: 0.58, footprint: 0.69 } },
  shore: { range: 21, cycle: 9.6, tuning: { strength: 0.47, footprint: 0.63 } },
  mist: { range: 50, tuning: { strength: 0.67, footprint: 1.3 } },
  pollen: { range: 17, tuning: { strength: 0.35, footprint: 0.94 } },
  seeds: { range: 19, tuning: { strength: 0.39, footprint: 0.75, wind: 0.3 } },
  leaves: { range: 23, tuning: { strength: 0.47, footprint: 0.89, wind: 0.22 } },
  motes: { range: 19, tuning: { strength: 0.38, footprint: 0.84 } },
  sand: { range: 20, tuning: { strength: 0.57, footprint: 0.82, wind: 0.31 } },
  moths: { range: 22, tuning: { strength: 0.54, footprint: 0.83 } },
  snuff: { range: 13, tuning: { strength: 0.52, footprint: 0.66 } },
  marketRunoff: { range: 22, tuning: { strength: 0.68, footprint: 0.88 } },
  marketDrip: { range: 18, tuning: { strength: 0.61, footprint: 0.79 } },
  marketRings: { range: 18, tuning: { strength: 0.79, footprint: 0.49 } },
} as const

export const starterTrailLooks = {
  wake: { turnAway: 0.48, baseSpeed: 0.73, speedGain: 0.065, maxStrength: 0.91, strengthPerSpeed: 0.17, footprint: 0.89 },
  roadSpray: { wadingStrength: 0.8, rainStrength: 0.6, footprint: 0.78 },
  brakeChips: { strength: 0.61, footprint: 0.8 },
  tireDust: { strength: 0.49, footprint: 0.79 },
  paddle: { rise: 0.035, portYawRatio: 0.9, tuning: { strength: 0.69, footprint: 0.81 } },
  rain: { fallHeight: 4.1, floorGap: 0.03, strength: 0.48, footprint: 1.34 },
  bubbles: { belowWater: 0.37, tuning: { strength: 0.66, footprint: 0.74 } },
} as const

type Burst = readonly [strength: number, footprint: number, seconds?: number, delaySeconds?: number]
export const starterBurstLooks = {
  harvest: { rise: 0.26, emission: [1, 0.85] satisfies Burst },
  hoe: { rise: 0.041, emission: [1, 0.84] satisfies Burst },
  rose: { pitch: -0.31, emission: [1, 0.88, 0.28] satisfies Burst },
  puddles: { rise: 0.013, emission: [0.76, 0.79, 0.31, 0.34] satisfies Burst },
  wadingRings: [0.85, 0.84, 0.1] satisfies Burst,
  wadingDrops: { rise: 0.04, speed: 0.72, emission: [0.42, 0.55, 0.10] satisfies Burst },
  bootDrain: { rise: 0.018, yawSpread: 0.08, emission: [0.69, 0.92, 0.085] satisfies Burst },
  fern: { rise: 0.4, emission: [0.63, 0.8] satisfies Burst },
  clover: { rise: 0.27, emission: [0.65, 0.75] satisfies Burst },
  snapshotFootprint: 0.88,
  fishSpray: [0.81, 0.86] satisfies Burst,
  crateGrainFootprint: 0.72,
} as const
