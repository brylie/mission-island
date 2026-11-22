export const lookoutAshMesh = {
  grid: { steps: 16, raised: 0.017 },
  edge: { ripple: 0.089, uFrequency: 13, vFrequency: 7, crossFrequency: 10, fade: 6, trailFade: 5 },
  dust: { opacity: 0.77, variation: 0.16, uFrequency: 47, vFrequency: 11, crossFrequency: 46 },
  soot: { base: 0.62, stripes: 0.28, uFrequency: 9, vFrequency: 6.5, flecks: 0.09, fleckU: 51, fleckV: 18, greenScale: 0.98 },
  finish: '#645951',
} as const

export const lookoutVergeBlade = { raised: 0.021, bendAtJoint: 0.42, heightAtJoint: 0.66 } as const

export const lookoutTwig = {
  bark: { y: 0.046, width: 0.087, height: 0.075, finish: '#493c35' },
  exposedEnd: { y: 0.044, size: [0.077, 0.057, 0.023], finish: '#b48c63' },
} as const
