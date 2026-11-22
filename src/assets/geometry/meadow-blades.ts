export const meadowBladeGeometry = {
  color: '#618752',
  bladesPerTuft: 3,
  width: { minimum: 0.058, variation: 0.038 },
  height: { minimum: 0.20, variation: 0.25 },
  profile: [
    [-1, 0],
    [1, 0],
    [0, 0.52],
    [0.93, 0.52],
    [2.4, 1],
  ],
  triangles: [0, 1, 2, 1, 3, 2, 2, 3, 4],
} as const
