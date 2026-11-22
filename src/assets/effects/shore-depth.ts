export const shoreDepthEncoding = { depthBias: 0.25, depthSpan: 2.75, highShift: 8, max: 65535 } as const
export const shoreDepthTiles = {
  coast: { border: 2, columns: 512, rows: 640 },
  basin: { halfWidth: 6, halfLength: 5, columns: 256, rows: 224 },
} as const
