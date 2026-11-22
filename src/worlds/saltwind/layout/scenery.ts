export const saltwindVehicleParking = {
  helicopter: { heading: 0.38, heightAboveGround: 0.20 },
} as const

export const saltwindPlantDistribution = {
  seed: 7367341,
  x: { start: -456, span: 912 },
  z: { start: -330, span: 660 },
} as const

// World-space habitat bands shared by plant placement, terrain coloring and the chart.
export const saltwindHabitatBands = {
  coast: { inner: 7, falloff: 25 },
  wetland: { inner: 7, falloff: 27, riverEndX: -85, riverFalloffX: 16 },
  woodland: {
    startZ: 105,
    fadeInZ: 100,
    endX: 35,
    fadeOutX: 170,
    startHeight: 17,
    heightFade: 16,
  },
  slate: { startHeight: 33, heightFade: 20, startX: 145, fadeInX: 90 },
  tarnstepBanks: { startZ: 166, fadeInZ: 10, endZ: 189, fadeOutZ: 11, innerWidth: 6, widthFade: 13 },
  exposedRidge: { startHeight: 52, heightFade: 17 },
} as const

export const alderCrownGroves = {
  centers: [[-215, 218], [-192, 248], [-72, 243], [98, 236]],
  radius: 34,
} as const

export const longAcreRows = {
  count: 21,
  spacing: 2.86,
  extraGap: { every: 7, distance: 1.2 },
  firstZ: 1,
  plants: { firstX: 92, columns: 32, spacing: 2.68, xJitter: 0.33 },
  bedCenter: { x: 133.5, y: 17.023 },
} as const

export const saltwindWildlifeSites = {
  alderCrownRoost: {
    tree: { x: -175, z: 221 },
    flockCenter: { x: -171, z: 224, y: 59 },
    landing: { x: -178, z: 229 },
  },
  reedwaterBats: {
    flockCenter: { x: -114, z: 79, y: 13 },
    perch: { x: -115, z: 79 },
  },
  mirrorLakeSchool: { offset: { x: -5, z: 23 }, deep: { x: 0.15, z: -0.99 } },
  meadowHares: { x: 48, z: 53 },
  forestHares: { x: -190, z: 227 },
} as const

export const saltwindPhenomenaSites = {
  mirrorLakeMist: { name: 'Mirror Lake dawn mist', kind: 'mist', extent: 62, seed: 5183 },
  sandspitPlankton: { name: 'Sandspit plankton', kind: 'glow', x: -248, y: 0, z: -272, extent: 9.8, seed: 6788 },
} as const
