export const materialControlsPreset = {
  gallerySpacing: [1, 0.45, 2.4, 0.05],
  metal: { abrasion: [0.34, 0, 1, 0.01], oxidation: [0, 0, 1, 0.01], scratchSpacing: [1, 0.45, 2.5, 0.05] },
  grainSize: [1, 0.45, 3, 0.05],
  contrast: [1, 0, 2, 0.05],
  relief: [1, 0, 2, 0.05],
  striations: [25, 8, 55, 1],
} as const

export const surfaceControlsPreset = {
  wearLimits: [0, 1, 0.01],
  relief: [1, 0, 2, 0.05],
  fineSpacing: { belowMm: 5, step: 0.1, minimumScale: 5, minimumDivisor: 10 },
  standardSpacing: { step: 1, minimumDivisor: 2 },
  maximumSpacingScale: 2,
} as const
