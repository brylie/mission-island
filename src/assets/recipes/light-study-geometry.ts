export const rainbowVolume = { width: 9.8, height: 6.1 } as const
export const emberBed = { width: 3.6, depth: 3.1, divisions: 18, studioLift: 0.022, groundLift: 0.074 } as const
export const lampHaloCard = { width: 4.3, height: 4.05, y: -0.70 } as const
export const moonGlitterPath = { width: 22, depth: 28 } as const

export const pollenMotes = {
  seed: 876,
  count: 56,
  volume: { width: 7, depth: 5, baseY: 0.37, height: 1.42 },
  radius: { minimum: 0.019, variation: 0.042 },
  density: { minimum: 0.27, variation: 0.46 },
  drift: { minimum: 0.22, variation: 0.44 },
  tilt: 0.74,
  corners: [[0, 0], [1, 0], [1, 1], [0, 1]],
  triangles: [0, 1, 2, 0, 2, 3],
} as const

export const demonstrationLampOffset = { x: -5.3, y: 0.93, z: -2.2, heading: 1.20 } as const
