export const waterLevel = -0.115

export const shoreStations = {
  centre: { radius: 0, y: 0 },
  meadowEdge: { radius: 0.865, y: 0 },
  sandEdge: { radius: 0.905, y: -0.015 },
  wetSand: { radius: 0.978, y: -0.065 },
  waterline: { radius: 1, y: waterLevel },
  shoal: { radius: 1.048, y: -0.98 },
  outerShoal: { radius: 1.10, y: -2.15 },
  seabed: { radius: 1.19, y: -4.3 },
}

export const shoreProfile = [
  shoreStations.centre,
  shoreStations.meadowEdge,
  shoreStations.sandEdge,
  shoreStations.wetSand,
  shoreStations.waterline,
  shoreStations.shoal,
  shoreStations.outerShoal,
  shoreStations.seabed,
]

export const starterCoastSeed = 101
export const coastlineLayout = {
  northStretch: 2.85,
  swells: { frequency: 5, phase: 0.2, amplitude: 0.018 },
  ripples: { frequency: 9, amplitude: 0.013 },
  landforms: [
    // The outside shoulder of the harbor and sheltered water beyond the terminals.
    { bearing: 210, halfWidth: 34, displacement: 12 },
    { bearing: 248, halfWidth: 30, displacement: -9 },
    { bearing: 275, halfWidth: 29, displacement: 11 },
    // Windstone's seaward point.
    { bearing: 70, halfWidth: 65, displacement: 24 },
    { bearing: 43, halfWidth: 53, displacement: -14 },
    { bearing: 100, halfWidth: 70, displacement: -12 },
    { bearing: 142, halfWidth: 76, displacement: -15 },
  ],
  noiseBands: [
    { wavelength: 64, amplitude: 4.2 },
    { wavelength: 24, amplitude: 1.6 },
    { wavelength: 9, amplitude: 0.45 },
  ],
  protectedShelves: [
    { bearing: 231, halfWidth: 13, fade: 9 },
    { bearing: 314, halfWidth: 21, fade: 13 },
  ],
} as const

export const tidePool = { x: 46, z: -33 }
export const meadowHill = { x: -25, z: 23 }
export const meadowFoot = { x: -26, z: 12 }
export const falls = { x: 11, z: 86 }
export const pool = { x: 23, z: 112 }
export const grove = { x: -50, z: 72 }
export const headland = { x: 39, z: 136 }

export const landRelief = {
  coastBlend: 0.055,
  meadow: { centre: meadowHill, width: 16, length: 14, height: 2.45 },
  northMeadow: { centre: { x: -9, z: 32 }, width: 10, length: 7.5, height: 1.55 },
  grove: { centre: grove, width: 33, length: 34, height: 9 },
  headland: { centre: headland, width: 32, length: 30, height: 15 },
  springShelf: { centre: { x: falls.x, z: falls.z - 4 }, width: 18, length: 10, height: 5.2 },
  mirrorBasin: { centre: pool, width: 19, length: 15, height: 1.8 },
  mirrorChannel: { halfWidth: 7.4, riseLength: 4, endZ: 135, endBlend: 10, depth: 1.4 },
} as const

export const fernfallChannel = {
  centreline: { x: 15, amplitude: 7, originZ: 90, frequency: 0.09 },
  streambed: {
    minZ: 80,
    maxZ: 93,
    bankReach: 4.5,
    outletBlend: 1.6,
    bankBlend: 1.7,
    minOffset: -0.46,
    maxOffset: 0.42,
    bankSlope: 0.74,
  },
} as const

// The stations follow the course from the spring shelf to the creek.
export const fernfallProfile = [
  { z: 81, y: 4.85, halfWidth: 0.18 },
  { z: 82, y: 4.82, halfWidth: 1.07 },
  { z: 83.6, y: 4.66, halfWidth: 0.86 },
  { z: 85.1, y: 3.42, halfWidth: 1.22 },
  { z: 86.0, y: 3.23, halfWidth: 1.01 },
  { z: 88.5, y: 0.18, halfWidth: 1.55 },
  { z: 89.9, y: waterLevel + 0.018, halfWidth: 1.86 },
  { z: 91.4, y: waterLevel - 0.04, halfWidth: 2.12 },
]

export const shellglassBasin = {
  halfWidth: 5,
  halfLength: 4,
  bearing: { forward: 0.89, lateral: 0.45 },
  alongRadius: 2.65,
  acrossRadius: 1.82,
  rimSwell: { amplitude: 0.085, frequency: 3, phase: 0.7 },
  rimRipple: { amplitude: 0.045, frequency: 5 },
  rimWidth: 0.48,
  depth: 0.63,
  rimHeight: 0.61,
} as const

export const driftwoodStrand = {
  scatterSeed: 3125,
  banks: [
    { angle: 5.10, radius: 1.012 },
    { angle: 5.18, radius: 0.972 },
    { angle: 5.26, radius: 1.012 },
    { angle: 5.36, radius: 0.972 },
    { angle: 5.44, radius: 1.012 },
    { angle: 5.53, radius: 0.972 },
    { angle: 5.62, radius: 1.012 },
  ],
} as const
