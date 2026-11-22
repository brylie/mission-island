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
  // The roar falls nearly silent in a lull; the hiss only rises on the stronger gusts.
  open: { lowLevel: 0.32, lowGustShare: 0.85, highLevel: 0.2, highGustCurve: 1.8 },
  // Two gentle crowns close by: present under the gusts, never a wall of rustle.
  canopy: { level: 0.22, reachMetres: 14, fullMetres: 3, voices: 2, gustOffsetSeconds: [0, 1.3], loopOffsetSeconds: [0, 3.1], crownHeightShare: 0.7, retargetSeconds: 0.5 },
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
