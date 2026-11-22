export const footstepRecipe = {
  gravel: {
    level: 0.55,
    body: { cutoffHz: 320, envelopeSeconds: [0.004, 0.022], gain: 0.6 },
    grains: {
      baseCount: 4,
      countVariation: 3,
      strengthCount: 3,
      startSeconds: 0.004,
      startVariationSeconds: 0.07,
      durationSeconds: 0.012,
      lowHz: 1800,
      lowVariationHz: 1600,
      highHz: 6500,
      envelopeSeconds: [0.0005, 0.0025],
      baseGain: 0.25,
      gainVariation: 0.6,
      strengthBase: 0.6,
      strengthGain: 0.5,
    },
  },
  sand: {
    level: 0.42,
    scrape: { cutoffHz: 950, strengthCutoffHz: 400, cutoffDropHzPerSecond: 2600, attackSeconds: 0.018, decaySeconds: 0.06, strengthDecaySeconds: 0.03 },
    body: { cutoffHz: 180, envelopeSeconds: [0.006, 0.03], gain: 0.5 },
  },
  boards: {
    level: 0.6,
    durationSeconds: 0.26,
    body: { cutoffHz: 700, envelopeSeconds: [0.002, 0.012], gain: 0.55 },
    modes: [
      { frequencyHz: 188, decaySeconds: 0.06, gain: 0.6, startSeconds: 0 },
      { frequencyHz: 337, decaySeconds: 0.035, gain: 0.32, startSeconds: 0.001 },
    ],
    pitchJitter: 0.08,
    modeStrengthGain: 0.2,
    grain: { bandHz: [2200, 6000], envelopeSeconds: [0.0006, 0.003], baseGain: 0.1, strengthGain: 0.2 },
  },
  fallback: { level: 0.22, cutoffHz: 480, envelopeSeconds: [0.005, 0.03] },
  // A heel on paving: a short bright tap over a low knock, then a light scuff.
  pavement: {
    level: 0.5,
    tap: { bandHz: [1100, 5200], envelopeSeconds: [0.0004, 0.004], gain: 0.75, strengthGain: 0.35 },
    knock: { cutoffHz: 260, envelopeSeconds: [0.002, 0.016], gain: 0.7 },
    scuff: { bandHz: [2000, 6500], startSeconds: 0.012, envelopeSeconds: [0.01, 0.035], gain: 0.16, strengthGain: 0.12 },
  },
  // Blades brushing the boot: a soft high swish with only a faint footfall under it.
  grass: {
    level: 0.34,
    swish: { bandHz: [1300, 6200], envelopeSeconds: [0.018, 0.055], gain: 0.8, strengthDecaySeconds: 0.03 },
    body: { cutoffHz: 160, envelopeSeconds: [0.006, 0.024], gain: 0.45 },
  },
  // Dry leaves and twigs on the forest floor: many tiny crackles over a hush.
  litter: {
    level: 0.46,
    hush: { bandHz: [900, 4800], envelopeSeconds: [0.012, 0.05], gain: 0.45 },
    crackles: {
      baseCount: 7,
      strengthCount: 6,
      spreadSeconds: 0.09,
      durationSeconds: 0.006,
      lowHz: 2600,
      lowVariationHz: 2200,
      highHz: 8500,
      envelopeSeconds: [0.0003, 0.0016],
      baseGain: 0.2,
      gainVariation: 0.55,
    },
  },
  // A boot in shallow water: a dark splash and a few rising bubbles.
  shallows: {
    level: 0.5,
    durationSeconds: 0.34,
    splash: { cutoffHz: 1500, strengthCutoffHz: 900, envelopeSeconds: [0.006, 0.07], gain: 0.9 },
    bubbles: { count: 3, fromHz: 380, toHz: 1100, pitchJitter: 0.15, spreadSeconds: 0.12, decaySeconds: 0.025, gain: 0.32 },
  },
  // Rain-soaked ground: the high end dulls and a soft squelch follows the footfall.
  damp: {
    keepBright: 0.45,
    dullCutoffHz: 1700,
    squelch: { cutoffHz: 620, startSeconds: 0.01, envelopeSeconds: [0.012, 0.07], gain: 0.42 },
  },
  durationSeconds: 0.2,
  // Audible steps per walker are at least this far apart, so a brisk gait sounds like about 3.8 steps a second.
  playback: { baseGain: 0.55, strengthGain: 0.45, minimumIntervalSeconds: 0.26 },
} as const
