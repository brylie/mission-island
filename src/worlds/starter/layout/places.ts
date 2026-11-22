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
export const extinguisherStarts = [{ x: 20, z: 22 }, { x: 22, z: 22 }]

// Wren keeps the loaned toolbox on the mending bench at the north edge of the ferry yard.
export const mendingBenchSite = { x: -23.4, z: -15.8, heading: Math.PI / 2 }
export const mendingBenchToolboxOffsetZ = 0.42
