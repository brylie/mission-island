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

export const longAcreApiary = { x: 181.4, z: 25.8 }
export const longAcreFlowerBeds = [
  { x: 179.1, z: 25.9, name: 'Sheltered clover', petals: '#f2d7bd' },
  { x: 182.6, z: 28.1, name: 'Sunlit trefoil', petals: '#efbb51' },
  { x: 179.3, z: 29.3, name: 'Phacelia by the barrels', petals: '#b394d1' },
] as const
export const longAcreHiveEntrances = [{ x: 179.0, z: 23.15 }, { x: 181, z: 23.15 }] as const
export const longAcreHoneyStops = {
  kit: { x: 185.7, z: 26.4 },
  extractor: { x: 184.1, z: 22.0 },
  market: { x: 160.6, z: -39.5 },
} as const

export const longAcreGardenPlacement = {
  inspectionApproach: { x: 187, z: 27 },
  props: { marketShelfOffsetZ: 0.65, kitBenchOffsetX: 1.02, extractorBenchOffsetX: 0.68 },
  hedge: { x: 177.7, z: 25.2, count: 10, spacing: 0.34, weave: 0.15, weaveRate: 1.7 },
  rail: { z: 24.25, postX: [182.4, 184.7, 187], railCenterFromPost: 1.15 },
  steppingStones: { x: 187.55, z: 26.72, count: 6, spacingZ: 0.77, turnAfter: 3, turnStepX: 0.55 },
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

export const brinewickGullPosts = { x: -286.7, z: [-218.9, -217.8, -216.6, -215.3], alternatingInset: 0.22 } as const

export const saltwindPhenomenaSites = {
  mirrorLakeMist: { name: 'Mirror Lake dawn mist', kind: 'mist', extent: 62, seed: 5183 },
  sandspitPlankton: { name: 'Sandspit plankton', kind: 'glow', x: -248, y: 0, z: -272, extent: 9.8, seed: 6788 },
} as const

export const saltwindBuildingLots = [
  { site: 'fish-market', kind: 'market', x: -247, z: -132, width: 15.8, depth: 11.4, height: 4.4, facing: 0, wall: '#72a6a1', roof: '#b86351' },
  { site: 'police', kind: 'police', x: -251, z: -69, width: 18, depth: 11.3, height: 5.1, facing: Math.PI, wall: '#668a99', roof: '#38555b' },
  { site: 'apartments', kind: 'apartments', x: -307, z: -144, width: 17, depth: 13.1, height: 9.5, facing: 0, wall: '#d4916b', roof: '#7b5450' },
  { site: 'grocery', kind: 'shop', x: -320, z: -74, width: 18, depth: 13.2, height: 4.6, facing: Math.PI, wall: '#edc780', roof: '#56816e' },
  { site: 'farmers-market', kind: 'market', x: 152, z: -30, width: 22, depth: 12, height: 5.3, facing: Math.PI, wall: '#dda553', roof: '#ab5445' },
  { site: 'school', kind: 'school', x: 271, z: -38, width: 18.4, depth: 12.3, height: 5.4, facing: -Math.PI / 2, wall: '#edca92', roof: '#b66150' },
  { site: 'hospital', kind: 'hospital', x: 136, z: 102, width: 23, depth: 13.5, height: 7.5, facing: 0, wall: '#e4dcc0', roof: '#658b82' },
  { site: 'fire', kind: 'fire', x: -57, z: 195, width: 21, depth: 13, height: 5.9, facing: Math.PI, wall: '#b65d4e', roof: '#815049' },
  { site: 'church', kind: 'church', x: -23, z: 192, width: 10, depth: 15, height: 6.1, facing: Math.PI, wall: '#ead7aa', roof: '#557374' },
  { site: 'timber', kind: 'mill', x: -249, z: 161, width: 23, depth: 16, height: 6.8, facing: 0, wall: '#a57550', roof: '#625b48' },
  { site: 'mine', kind: 'mine', x: 265, z: 181, width: 20, depth: 9.5, height: 5.8, facing: Math.PI, wall: '#a3937e', roof: '#68615a' },
  { site: 'airport', kind: 'hangar', x: 170, z: -114, width: 26, depth: 16, height: 7, facing: Math.PI, wall: '#7e9c99', roof: '#4f6973' },
] as const

export const saltwindCottageLots = [
  [-288, -86, Math.PI],
  [-285, -124, 0],
  [-268, -70, Math.PI],
  [-294, -64, Math.PI],
  [125, -42, Math.PI],
  [146, -85, 0],
  [172, -84, 0],
  [196, -16, Math.PI],
  [249, 3, -Math.PI / 2],
  [-84, 167, Math.PI],
  [-40, 173, Math.PI],
  [-28, 142, 0],
  [6, 162, Math.PI],
  [25, 137, 0],
] as const

export const saltwindEffectSites = {
  mill: { ventFromLot: { x: 3.25, z: 0.82, roofLift: 1.64 }, saw: { x: -234, z: 167.8, lift: 0.012 } },
  eddy: { fallsZ: 170.7, sideRatio: 0.63, lift: 0.039, downstream: 1.61 },
  mineSlate: { zFromStop: 13.4, radius: 9 },
  picnicMist: { x: -4.1, z: -4.4, lift: 0.24 },
} as const
