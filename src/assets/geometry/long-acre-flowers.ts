export const longAcreFlowerGeometry = {
  stem: { centreHeight: 0.5, width: 0.028, depth: 0.034 },
  leaf: { x: 0.052, heightRatio: 0.56, size: [0.138, 0.042, 0.071], segments: 4, tilt: 0.49 },
  petal: { count: 5, angleStepInPi: 0.4, radius: 0.069, size: [0.117, 0.066, 0.112], segments: 5 },
  centre: { rise: 0.017, size: [0.087, 0.061, 0.086], segments: 5 },
} as const

// Local bloom positions are also the landing targets used by the pollinators.
export const longAcreFlowerOffsets = [
  { x: -0.62, z: -0.23, height: 0.48 },
  { x: 0.52, z: -0.36, height: 0.59 },
  { x: -0.08, z: 0.35, height: 0.54 },
  { x: 0.36, z: 0.55, height: 0.46 },
  { x: -0.53, z: 0.47, height: 0.62 },
  { x: 0.05, z: -0.62, height: 0.54 },
] as const

export const longAcreGroundCover = {
  scatter: { count: 14, turn: 2.399, baseRadius: 0.21, ringStep: 0.21, ringCount: 5, depthScale: 0.83 },
  leaf: { y: 0.062, width: 0.25, widthStep: 0.07, widthLevels: 3, height: 0.15, depth: 0.26, segments: 4 },
} as const
