export const auditionControls = {
  seed: { value: 1, min: 1, max: 9999, step: 1 },
  distance: [6, 0, 60, 1],
  breaker: [0.5, 0, 1, 0.05],
  spacing: [1, 0.6, 1.6, 0.05],
  pace: [8, 2, 12, 0.5],
  impact: [0.6, 0, 1, 0.05],
} as const
