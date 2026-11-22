export const objectiveMarkerLook = {
  groundOffset: 0.095,
  ring: { thickness: 0.115, segments: 60 },
  curtain: { topScale: 1.013, segments: 64, rows: 8, opacity: 0.34, fadePower: 2.6, alphaIndex: 2 },
  haloOpacity: 0.82,
} as const

export const cargoTag = { box: [0, 0.26, -0.456, 0.35, 0.12, 0.024], color: '#fff0bd' } as const

export const starterObjectiveDiameters = { pickup: 8, market: 4.5, jobBoard: 5.6, lookout: 9.7, supplies: 5.3 } as const
