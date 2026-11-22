type Point = readonly [x: number, y: number, z: number]

const shoulder = [0, 0, 0.12] satisfies Point
const leadingEdge = [0.34, 0.025, 0.18] satisfies Point
const trailingRoot = [0.13, -0.015, -0.18] satisfies Point

export const wingedAnimalGeometry = {
  body: { size: [0.22, 0.17, 0.48], segments: 5 },
  birdWing: [shoulder, leadingEdge, [0.81, 0, -0.07], [0.54, -0.025, -0.23], trailingRoot] satisfies readonly Point[],
  batWing: [shoulder, leadingEdge, [0.54, 0, -0.07], [0.39, -0.025, -0.11], trailingRoot] satisfies readonly Point[],
  wingFaces: [0, 1, 2, 0, 2, 3, 0, 3, 4],
} as const
