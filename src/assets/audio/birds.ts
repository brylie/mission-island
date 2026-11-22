// Gull calls and woodland song: short generated phrases with a recognizable shape and bounded variation.
export const birdRecipe = {
  // A harsh, falling "kek", repeated two to four times.
  kek: { notes: [2, 4], noteSeconds: 0.11, gapSeconds: 0.07, fromHz: 1750, toHz: 1050, harmonics: [1, 0.55, 0.3], modulationHz: 95, modulationDepth: 0.25, breath: 0.18, pitchJitter: 0.08 },
  // A long, descending mew from a gliding gull.
  mew: { seconds: 0.62, fromHz: 1450, toHz: 820, harmonics: [1, 0.4, 0.18], vibratoHz: 7, vibratoDepth: 0.04, breath: 0.12, pitchJitter: 0.1 },
  // Wing beats as a gull pushes off: soft, low feather thumps.
  flap: { beats: [3, 5], spacingSeconds: 0.085, bandHz: [280, 1700], envelopeSeconds: [0.006, 0.035], gain: 1 },
  // A small songbird phrase of quick, high, sweeping notes.
  song: { notes: [4, 8], noteSeconds: [0.04, 0.12], gapSeconds: [0.02, 0.08], lowHz: 2600, highHz: 6200, harmonics: [1, 0.2], breath: 0.05 },
  attackSeconds: 0.008,
  releaseSeconds: 0.03,
} as const

export const birdLife = {
  harbor: {
    earshotMetres: 70,
    level: 0.5,
    flapLevel: 0.4,
    restingCallSlotSeconds: 9,
    restingCallChance: 0.35,
    takeoffCallChance: 0.45,
    landingCallChance: 0.6,
  },
  thermal: { earshotMetres: 160, level: 0.42, callSlotSeconds: 14, callChance: 0.3 },
  // Songbirds in the wooded regions during the day; they fall quiet in heavy rain.
  song: {
    earshotMetres: 60,
    level: 0.34,
    firstHour: 5.5,
    lastHour: 19.5,
    maxRain: 0.6,
    singersPerRegion: 2,
    spreadShare: 0.6,
    perchHeightMetres: 4,
    slotSeconds: 6,
    chance: 0.45,
  },
  variants: 4,
} as const
