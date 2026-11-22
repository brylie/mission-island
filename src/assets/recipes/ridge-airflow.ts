export const updraftMotes = {
  colors: { ridge: '#d4c2ff', thermal: '#ffd9a0' },
  count: 28,
  sphere: { dimensions: [0.14, 0.48, 0.14], segments: 4 },
  orbit: { minimum: 0.23, bands: 6, bandSpacing: 0.105, turn: 2.4 },
  phaseStride: 11,
  rate: { minimum: 0.22, bands: 5, bandSpacing: 0.023, strengthBlend: [0.55, 0.45] },
  shareStride: 17,
  minimumStrength: 0.02,
  rise: { spin: 1.8, fadeIn: 8, fadeOut: 6, baseY: 0.4 },
  scale: { width: 0.13, height: 0.54 },
  previewHour: 13,
} as const
