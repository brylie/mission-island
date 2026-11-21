// A hollow truck bed rings lower and longer than packed ground.
export const crateImpactRecipe = {
  ground: {
    durationSeconds: 0.55,
    thump: { fromHz: 115, toHz: 58, decaySeconds: 0.045 },
    resonance: { frequenciesHz: [214, 388, 612], decaySeconds: 0.05 },
  },
  bed: {
    durationSeconds: 0.85,
    thump: { fromHz: 150, toHz: 74, decaySeconds: 0.07 },
    resonance: { frequenciesHz: [176, 284, 455, 731], decaySeconds: 0.16 },
  },
  thumpPitchJitter: 0.05,
  burst: { cutoffHz: 600, strengthCutoffHz: 900, envelopeSeconds: [0.002, 0.014], gain: 0.7 },
  wood: {
    decayJitter: 0.2,
    pitchJitter: 0.06,
    decayFalloff: 0.35,
    baseGain: 0.32,
    strengthGain: 0.45,
    gainFalloff: 0.6,
    maxStartSeconds: 0.002,
  },
  splinter: {
    bandHz: [2400, 7000],
    attackSeconds: 0.0008,
    decaySeconds: 0.004,
    strengthDecaySeconds: 0.006,
    baseGain: 0.08,
    strengthGain: 0.55,
  },
  playback: { baseGain: 0.18, strengthGain: 0.82 },
} as const
