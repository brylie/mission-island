// Brushing past plants and trees. Stiffness follows the understory geometry: rushes stand tall and stiff,
// ferns bend softly, marram is short and dry.
export const foliageContact = {
  plants: {
    fern: { reachMetres: 0.55, stiffness: 0.35, level: 0.42 },
    rushes: { reachMetres: 0.5, stiffness: 0.8, level: 0.46 },
    marram: { reachMetres: 0.45, stiffness: 0.55, level: 0.36 },
  },
  // Trunk radius plus a shoulder: closer than this, a crewmate is brushing the bark.
  trunk: { reachMetres: 0.62, level: 0.38, cooldownSeconds: 1.5 },
  // Leaving a plant needs a clear step past its reach, so standing at an edge cannot chatter.
  exitScale: 1.6,
  minimumSpeed: 0.4,
  fullSpeed: 7,
  // At most one rustle per walker in this time, however dense the patch.
  walkerCooldownSeconds: 0.12,
} as const

export const foliageRecipe = {
  durationSeconds: 0.42,
  fern: { bandHz: [1100, 6000], attackSeconds: 0.025, decaySeconds: 0.12, strengthDecaySeconds: 0.08, bursts: 3, burstSpreadSeconds: 0.12 },
  rushes: {
    bandHz: [1900, 7600],
    attackSeconds: 0.012,
    decaySeconds: 0.08,
    strengthDecaySeconds: 0.05,
    bursts: 2,
    burstSpreadSeconds: 0.08,
    stems: { count: 4, bandHz: [2800, 8200], envelopeSeconds: [0.0004, 0.003], gain: 0.45, spreadSeconds: 0.1 },
  },
  marram: { bandHz: [2600, 9000], attackSeconds: 0.01, decaySeconds: 0.06, strengthDecaySeconds: 0.04, bursts: 2, burstSpreadSeconds: 0.06 },
  trunk: {
    scrape: { bandHz: [380, 2400], envelopeSeconds: [0.012, 0.11], gain: 0.8 },
    tick: { frequencyHz: 1150, decaySeconds: 0.014, gain: 0.5, startSeconds: 0.03, pitchJitter: 0.2 },
  },
  burstGainVariation: 0.5,
  playback: { baseGain: 0.45, strengthGain: 0.55 },
} as const
