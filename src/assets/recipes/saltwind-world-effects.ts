export const saltwindPlaceLooks = {
  steam: { range: 58, tuning: { strength: 0.55, footprint: 1.03, wind: 0.34 } },
  dustFan: { cycle: 8, range: 20, tuning: { strength: 0.65, footprint: 0.88 } },
  millDust: { cycle: 8, range: 20, tuning: { strength: 0.57, footprint: 0.85 } },
  eddy: { range: 34, tuning: { strength: 0.54, footprint: 0.84 } },
  eddyOrbit: { xOffset: 0.92, swayRate: 2.7, sway: 0.33, zOffset: 0.21, lanes: 4, spacing: 0.15, angularSpeed: -1.43, peelAfter: 1.17 },
  hive: { range: 15, tuning: { strength: 0.33, footprint: 0.59 } },
  hiveApproach: { lift: 0.40, inboundEvery: 3, inset: 0.63, inboundLift: 0.2, inboundPitch: -0.19, outboundPitch: 0.09 },
  pollen: { range: 18, tuning: { strength: 0.33, footprint: 1 } },
  window: { range: 14, tuning: { strength: 0.63, footprint: 0.57 } },
  picnicMist: { range: 43, tuning: { strength: 0.72, footprint: 1.5, wind: 0.25 } },
} as const

export const saltwindWalkingLooks = {
  wading: { rise: 0.023, emission: [0.76, 0.83, 0.095] },
  slate: { rise: 0.082, floor: 0.012, emission: [0.48, 0.7, 0.11] },
  rain: { height: 4.1, floor: 0.03, strength: 0.47, footprint: 1.35 },
} as const
