export const strandPebble = {
  colors: ['#789997', '#899d8b'],
  segments: 4,
  frequency: 0.56,
  size: 0.12,
  sizeVariation: 0.46,
  heightScale: 0.45,
  depthScale: 0.52,
  depthVariation: 0.3,
} as const

export const scallop = {
  colors: ['#f4ddbc', '#dba69b', '#f4e5cf'],
  size: 0.11,
  sizeVariation: 0.10,
  baseClearance: 0.008,
  hinge: { height: 0.03, shade: 0.75 },
  ribs: { spokeCount: 18, arc: 2.4, interval: 2, rise: 0.06, shade: 0.83, shadeVariation: 0.17 },
  rows: [{ radius: 0.48, rise: 0.17, ridge: 0 }, { radius: 0.90, rise: 0.025, ridge: 0.07 }],
} as const
