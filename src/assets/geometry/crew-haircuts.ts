export const fittedHairGeometry = {
  fringe: { base: 0.12, frontRise: 0.38, templeLift: 0.08, templePower: 8 },
  baseHeight: 0.294,
  headRise: 0.266,
  firstRowInset: -0.004,
  scalpPadding: 0.009,
  crownPadding: 0.014,
  contourPower: 0.91,
  crownZ: -0.011,
  coils: {
    sides: 64,
    rows: 22,
    coilCount: 76,
    reliefFalloff: 65,
    edgeFluting: { amplitude: 0.023, frequency: 16 },
    lift: 0.018,
    baseTone: 0.91,
    reliefTone: 0.12,
    crownHeight: 0.584,
  },
  gathered: {
    sides: 48,
    rows: 16,
    part: { amplitude: 0.08, frequency: 2, phase: 0.8, frontDip: 0.075, frontPower: 12 },
    waves: { frequency: 11, zPhase: 3, bend: 0.35, bendFrequency: 4 },
    lift: 0.009,
    baseTone: 0.89,
    reliefTone: 0.13,
    crownHeight: 0.578,
  },
} as const

type BunSection = readonly [z: number, centerY: number, halfWidth: number, halfHeight: number]

// The knot sits below the cap band and narrows where it tucks into the nape.
const bunSections: readonly BunSection[] = [
  [-0.390, 0.227, 0.018, 0.025],
  [-0.378, 0.233, 0.070, 0.061],
  [-0.353, 0.240, 0.111, 0.087],
  [-0.316, 0.244, 0.132, 0.104],
  [-0.284, 0.245, 0.126, 0.100],
  [-0.255, 0.249, 0.096, 0.079],
  [-0.237, 0.252, 0.066, 0.056],
  [-0.195, 0.255, 0.061, 0.052],
]

export const lowBunGeometry = {
  sections: bunSections,
  sides: 32,
  folds: { count: 4, twist: 6, radiusBase: 0.94, radiusVariation: 0.09, baseTone: 0.86, toneVariation: 0.17 },
} as const
