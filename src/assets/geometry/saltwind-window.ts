const width = 1.4
const glassDepth = 0.044
const glassOffset = 0.064

export const saltwindWindowGeometry = {
  frame: { size: [width + 0.16, 1.28, 0.11] },
  glazing: { z: glassOffset, size: [width, 1.08, glassDepth] },
  mullion: { z: 0.091, size: [0.065, 1.09, 0.038] },
  sill: { y: -0.64, z: 0.10, size: [width + 0.24, 0.12, 0.29] },
} as const

export const saltwindWindowRow = { centreY: 1.95, edgeFraction: 0.31 } as const
export const saltwindWindowRain = {
  y: saltwindWindowRow.centreY + 0.11,
  z: glassOffset + glassDepth / 2 + 0.062,
  floor: saltwindWindowRow.centreY - 0.5,
} as const
