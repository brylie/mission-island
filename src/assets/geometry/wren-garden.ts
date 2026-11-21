export const woodpileGeometry = {
  courses: 3,
  bottomLogCount: 4,
  logDiameter: 0.21,
  logLength: 0.62,
  supportBoxes: [[1.05, 0.65, 0.6]],
} as const

const barrelHeight = 0.8
const barrelRimDiameter = 0.55
export const rainBarrelGeometry = {
  height: barrelHeight,
  rimDiameter: barrelRimDiameter,
  supportBoxes: [[barrelRimDiameter, barrelRimDiameter, barrelHeight]],
} as const

const sawhorseBeamWidth = 1.1
export const sawhorseGeometry = { beamWidth: sawhorseBeamWidth, supportBoxes: [[sawhorseBeamWidth, 0.4, 0.75]] } as const

const mendingBenchSurface = { width: 1.6, depth: 0.7, top: 0.86, centreY: 0.82, thickness: 0.08 } as const
export const mendingBenchGeometry = {
  surface: mendingBenchSurface,
  supportBoxes: [[mendingBenchSurface.width, mendingBenchSurface.depth, mendingBenchSurface.top]],
} as const

export const flowerBedFrame = { overhang: 0.1, supportHeight: 0.16 } as const
