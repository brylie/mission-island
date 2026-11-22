// Wind sounds: seamless noise loops whose levels follow the shared gust envelope and the listener's exposure.
export const windRecipe = {
  sampleRate: 16000,
  loopSeconds: 6,
  loopFadeSeconds: 0.6,
  // Open air: a low roar and a higher hiss that sharpens on the gust peaks.
  low: { cutoffHz: 260, secondCutoffHz: 420 },
  high: { bandHz: [700, 4200] },
  // Canopies: leafy crowns flutter, needle crowns hush. Flutter cycles must divide the loop evenly.
  leaves: { bandHz: [1400, 7000], flutter: { cyclesPerLoop: [7, 17, 29], depth: 0.55 } },
  needles: { bandHz: [2400, 9000], flutter: { cyclesPerLoop: [5, 11], depth: 0.25 } },
} as const

export const windMix = {
  open: { lowLevel: 0.5, lowGustShare: 0.65, highLevel: 0.34, highGustCurve: 1.6 },
  canopy: { level: 0.55, reachMetres: 18, fullMetres: 4, voices: 3, gustOffsetSeconds: [0, 0.9, 1.7], loopOffsetSeconds: [0, 2.1, 4.3], crownHeightShare: 0.7, retargetSeconds: 0.5 },
  // Exposure: open near the shore and on high ground, sheltered among trees.
  exposure: {
    base: 0.25,
    coastFrom: 0.55,
    coastTo: 0.95,
    coastShare: 0.45,
    heightForFullMetres: 15,
    heightShare: 0.4,
    shelterReachMetres: 12,
    treesForFullShelter: 8,
    shelterLoss: 0.7,
  },
  levelSeconds: 0.8,
} as const
