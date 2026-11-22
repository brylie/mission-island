type Point = readonly [x: number, y: number, z: number]

export const schoolingFishGeometry = {
  vertices: [
    [0, 0, 0.39],
    [0.095, 0, 0.035],
    [0, 0.12, 0.02],
    [-0.095, 0, 0.035],
    [0, -0.085, 0.02],
    [0, 0, -0.29],
    [0, 0.105, -0.44],
    [0, -0.096, -0.44],
  ] satisfies readonly Point[],
  faces: [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4, 5, 6, 7],
} as const
