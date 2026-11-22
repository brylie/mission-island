export const island = { width: 134, length: 92 }
export const harbor = { x: -46, z: -16 }
export const town = { x: 40, z: 13 }
export const lookout = { x: 7, z: 29 }
export const beach = { x: 32, z: -35.5 }
export const forest = { x: -27, z: 22 }

export const truckStart = { x: -41, z: -11, heading: Math.PI / 2 }
export const skiffStart = { x: -48.5, z: -35.8, heading: -2.5 }
export const harborDockAnchor = { x: -44, firstZ: -29 } as const
export const harborDockPileLayout = { lateralOffsets: [-1.6, 1.6], distanceAlongDock: [2, 5, 8] } as const
export const ferryTerminal = { x: -30, z: -31, width: 6 }

const cottageFootprint = { w: 4.5, d: 3.9 }
const crewCottageShell = { ...cottageFootprint, h: 3.4 }
export const doorApproach = 0.55
export const crewSpawnSetback = 1.34

// Home order is also the crew slot order.
export const crewHomes = [
  { name: 'Amber cottage', building: { x: -52, z: -4.65, ...crewCottageShell, wall: '#f2d5a4', roof: '#a85d36' }, chest: { x: -50.65, z: -7.52 }, wardrobe: { x: -53.35, z: -7.27 } },
  { name: 'Blue cottage', building: { x: -45, z: -4.65, ...crewCottageShell, wall: '#d5e9dc', roof: '#477986' }, chest: { x: -43.65, z: -7.52 }, wardrobe: { x: -46.35, z: -7.27 } },
]

export const wrenCottage = { x: -35.8, z: -2.4, ...cottageFootprint, h: 3.3, wall: '#e9d6c3', roof: '#6c5c86' }

export interface StarterBuilding {
  x: number
  z: number
  heading?: number
  w: number
  d: number
  h: number
  wall: string
  roof: string
}

export const publicBuildings: StarterBuilding[] = [
  { x: -50, z: -22, w: 8, d: 5, h: 4.65, wall: '#f3c78e', roof: '#a84632' },
  { x: -38, z: -20, w: 6, d: 5, h: 4.1, wall: '#f7e3a1', roof: '#1b7773' },
  { x: 35, z: 22, w: 6, d: 5, h: 4.8, wall: '#f4ce91', roof: '#b74635' },
  { x: 43, z: 22, w: 6, d: 5, h: 5.25, wall: '#eb9973', roof: '#9e3c39' },
  { x: 50, z: 21.4, w: 4, d: 4, h: 4.1, wall: '#ffe8b7', roof: '#236b75' },
  { x: 39, z: 2.6, heading: Math.PI, w: 6, d: 5, h: 4.9, wall: '#f5e3b2', roof: '#b74e36' },
  { x: 48, z: 2.6, heading: Math.PI, w: 5, d: 5, h: 4.35, wall: '#76b7a3', roof: '#25585f' },
  { x: 25, z: 18, w: 4, d: 4, h: 4.1, wall: '#e47c63', roof: '#a02e30' },
  { x: 10, z: 33, w: 3, d: 3, h: 4.65, wall: '#d6b188', roof: '#12605b' },
]

// Supply order defines the initial item IDs.
export const crateStarts = [
  { x: -49, z: -15 },
  { x: -47, z: -17 },
  { x: -45, z: -15 },
]
export const extinguisherStock = { x: 21, z: 22 }
export const extinguisherStarts = [{ ...extinguisherStock, x: extinguisherStock.x - 1 }, { ...extinguisherStock, x: extinguisherStock.x + 1 }]

// Wren keeps the loaned toolbox on the mending bench at the north edge of the ferry yard.
export const mendingBenchSite = { x: -23.4, z: -15.8, heading: Math.PI / 2 }
export const mendingBenchToolboxOffsetZ = 0.42

export const starterEffectSites = {
  fernfall: { z: 89.4, lift: 0.07 },
  shore: { bearings: [-0.99, -0.86], shorelineRadius: 1.003, lift: 0.035, floor: 0.012 },
  poolMist: { x: 9.8, z: 2.6, lift: 0.185 },
  pollen: { beds: [{ x: 31, z: -25, lift: 0.34 }, { x: 35.8, z: -23.7, lift: 0.39 }], juniperLift: 0.43 },
  seedPatch: { x: 36.2, z: -29.9, lift: 0.53 },
  woodsLeaves: { x: -29, z: 20.7, lift: 1.42 },
  meadowMotes: { x: -23.8, z: 23.7, lift: 1.23 },
  sand: { bearing: -0.98, shorelineRadius: 0.961, lift: 0.06 },
  jobBoardLantern: { x: 0.6, z: 0.11, shelfHeight: 1.05, smokeLift: 0.24 },
  marketRainRings: { xFromMarket: -1.29, z: 7.02 },
} as const

export const starterShaderSites = {
  wake: { x: -48, z: -41 },
  wading: { x: 46.2, z: -33.05 },
  caustics: { x: 0.2, z: -0.6 },
  poolRain: { x: -2, z: 0 },
  fernfall: { centerAtZ: 87, z: 86.6 },
  canopy: { x: 2, z: -3 },
  reeds: { x: -13, z: -3 },
  sand: { x: 36.7, z: -36.8, footprints: { minX: 24, maxZ: -26, minCoastRadius: 0.925, maxDepth: 0.028 } },
  flowers: { x: -2.2, z: -1 },
  awning: { x: -3.9, z: 1.1 },
  blueCottageWindow: { x: -43.605, z: -6.765 },
  reflectors: { x: -33.5, z: -11 },
  ropeAtDock: { x: 1.12, z: -32.45 },
  rainbow: { x: 2, z: 89.3 },
  embers: { x: 0.4, z: 0.2 },
  pollen: { x: -0.4, z: 1.6 },
  moon: { x: -44, z: -45 },
} as const

export const landmarkPlacements = {
  harbor: { xOffset: 1.3, zOffset: -5, height: 4 },
  town: { height: 2.6 },
  forest: { height: 7 },
  beach: { height: 2.2 },
  lookout: { height: 4.3 },
  aviation: { height: 2.8, closeRange: 26 },
  farm: { height: 1.32 },
  market: { height: 3.32 },
  clothing: { height: 1.48, closeRange: 16 },
  board: { height: 2.35 },
  supplies: { height: 2.4 },
  ferry: { height: 2.1, visitRange: 38 },
  rawMaterials: { height: 1.16, closeRange: 18 },
  repair: { height: 1.55, closeRange: 22 },
  home: { height: 2.5 },
  chest: { height: 0.95, closeRange: 12 },
  wardrobe: { height: 2.09, closeRange: 12 },
} as const

export const harborJobSites = {
  board: { x: -43.7, z: -16.1 },
  farmDrop: { x: 24, z: -17.2 },
  beachDrop: { x: 29, z: -24 },
} as const
