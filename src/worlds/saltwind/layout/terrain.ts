export const coastline = {
  radiusX: 450,
  radiusZ: 312,
  distanceScale: 325,
  broadSwell: { amplitude: 0.061, frequency: 3, phase: 0.8 },
  headlands: { amplitude: 0.041, frequency: 5, phase: 0.6 },
  coves: { amplitude: 0.022, frequency: 9 },
  ferryBay: { x: -278, z: -251, radiusX: 48, radiusZ: 63, depth: 17 },
} as const

export const upland = {
  seaFloor: { minimumY: -19, slope: 0.36 },
  shoreRise: { height: 9, distance: 35 },
  inlandBlendDistance: 85,
  meadow: { height: 3.8, rippleHeight: 1.8, sineX: 0.031, sineZ: 0.012, cosineZ: 0.032 },
  // The order preserves the sum before applying the coastal blend.
  mounds: [
    { x: -135, z: 233, radiusX: 164, radiusZ: 139, height: 55 },
    { x: 112, z: 247, radiusX: 124, radiusZ: 100, height: 38 },
    { x: 275, z: 135, radiusX: 122, radiusZ: 155, height: 37 },
    { x: -330, z: 55, radiusX: 104, radiusZ: 123, height: 20 },
    { x: -13, z: 8, radiusX: 104, radiusZ: 72, height: 16 },
    { x: -202, z: -110, radiusX: 67, radiusZ: 88, height: 5 },
  ],
} as const

export const reedwater = {
  lakeEndX: -87,
  waterStartX: -465,
  visibleStartX: -444,
  cutStartX: -495,
  halfWidth: 9,
  centreline: { baseZ: 125, slope: 0.32, bendOriginX: -350, bendSize: 9, bendFrequency: 0.028 },
  waterGrade: { originX: -440, slope: 0.0165 },
  bank: { slope: 0.48, reach: 26, blendStart: 11, blendWidth: 15 },
  lakeInlet: { startX: -155, reach: 12, blendStart: 8, blendWidth: 4 },
  bridges: { eastLimitX: -132, halfWidth: 21 },
} as const

export const tarnstep = {
  waterMinZ: 123,
  waterMaxZ: 199,
  cutMinZ: 121,
  centreline: { baseX: -120, bendOriginZ: 186, bendSize: 5, bendFrequency: 0.065 },
  halfWidth: {
    base: 3.2,
    lowerRipple: { size: 0.83, originZ: 169, frequency: 0.29 },
    upperRipple: { size: 0.48, frequency: 0.51 },
  },
  rises: [
    { startZ: 125, length: 30, height: 7.1 },
    { startZ: 171, length: 8.5, height: 10.8 },
    { startZ: 179, length: 5, height: 2.4 },
    { startZ: 184, length: 7.5, height: 12.9 },
    { startZ: 192, length: 5.5, height: 3 },
  ],
  bank: { width: 11, widening: 5, wideningStartZ: 163, wideningLength: 12, slope: 0.67 },
  viaduct: { z: 153, crossingReach: 11, openHalfWidth: 5, shoulderBlend: 5 },
} as const

export const terrainJunctions = [
  { name: 'mill', x: -259, z: 114, y: 28, xSlope: 0.014, zSlope: 0.036, reach: 22, blendStart: 5, blendWidth: 17 },
  { name: 'mine', x: 213, z: 101, y: 21, xSlope: 0.016, zSlope: 0.054, reach: 25, blendStart: 8, blendWidth: 17 },
] as const

export const picnicShelf = {
  radiusX: 6.8,
  radiusZ: 3.8,
  reach: 1.6,
  y: 30.85,
  zSlope: 0.027,
  blendStart: 0.65,
  blendWidth: 0.95,
} as const

export const cemeteryApproachGrade = {
  x: 19,
  halfWidth: 9,
  minZ: 153,
  maxZ: 176,
  riseStartZ: 155,
  riseLength: 18,
  lowY: 28.1,
  highY: 30,
  levelHalfWidth: 2,
  sideBlend: 7,
  endBlend: 3,
} as const

export const sandspitBeach = {
  edge: [{ x: -243, z: -268 }, { x: -239, z: -270 }, { x: -235, z: -276 }, { x: -231, z: -276 }, { x: -225, z: -283 }, { x: -218, z: -286 }],
  scatterSeed: 781,
  sand: { minX: -255, maxX: -200, maxZ: -250, minY: -4, maxY: 1.5 },
} as const

export const airstripWindsock = { x: 231, z: -119 } as const
