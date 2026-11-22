export interface MapPoint { x: number, z: number }

export const timberStacks = {
  baseCentreY: 30.42,
  placements: [[-204, 164], [-209, 177], [-225, 177]],
} as const

const cemeteryCentreX = 20
const cemeteryCentreZ = 190
export const alderwatchCemetery = {
  graveRows: { x: [9, 16, 24, 31], z: [182, 187, 192, 197] },
  wall: {
    sides: [{ x: cemeteryCentreX - 19, y: 30.43, z: cemeteryCentreZ }, { x: cemeteryCentreX + 19, y: 30.43, z: cemeteryCentreZ }],
    front: [{ x: cemeteryCentreX - 10.3, y: 30.43, z: 176 }, { x: cemeteryCentreX + 10.3, y: 30.43, z: 176 }],
    back: { x: cemeteryCentreX, y: 30.42, z: 204 },
  },
} as const

const standardServiceBay = { width: 4.4, depth: 9.5 } as const
export const markedVehicleBays: Readonly<Partial<Record<string, { width: number, depth: number }>>> = {
  'fish-market': standardServiceBay,
  'farmers-market': standardServiceBay,
  'hospital': standardServiceBay,
  'fire': { ...standardServiceBay, width: 5.1 },
  'mine': standardServiceBay,
  'timber': { ...standardServiceBay, depth: 13 },
}

export const brinewickMarketPlacements = {
  worktable: { id: 'fish-market-worktable', x: -243.38, z: -124.75 },
  outdoorRack: { id: 'fish-market-outdoor-net-rack', x: -252.2, z: -122.2 },
  shelteredRack: { id: 'fish-market-sheltered-net-rack', x: -250.58, z: -125.32 },
} as const

export const oreFreightBays = {
  quay: { name: 'Brinewick freight quay', x: -268, z: -208 },
  school: { name: 'Barleycross School', x: 253, z: -32 },
  market: { name: 'Barleycross Farmers Market', x: 184, z: -35 },
  dispatch: { x: 288, z: 156 },
  // On the turnaround, clear of the low chute and its timber supports.
  hopper: { x: 282, z: 171.5 },
} as const

export const islandName = 'Saltwind Island'
export const landBounds = { minX: -505, maxX: 505, minZ: -340, maxZ: 340 }
export const waterBounds = { minX: -560, maxX: 560, minZ: -430, maxZ: 430 }
const ferryDeck = { x: -274, z: -211 }
export const arrival = { x: ferryDeck.x, z: -266, y: 1.65 }
export const runway = { x: 46, z: -162, length: 420, width: 22, approach: 105, y: 8 }
export const helipad = { x: 115, z: 111, radius: 9 }
export const lowerLake = { x: -82, z: 104, rx: 44, rz: 32, y: 5.8 }
export const tarn = { x: -123, z: 219, rx: 29, rz: 22, y: 42 }
export const falls = { x: -120, z: 184, y: 25 }
export const viaductWalk = {
  id: 'viaduct-shelf',
  name: 'Tarnstep Survey Shelf',
  x: -137.2,
  z: 160,
  radius: 4,
  path: [
    { x: -169, z: 155.25 },
    { x: -165, z: 157 },
    { x: -159, z: 159 },
    { x: -150, z: 159.35 },
    { x: -139, z: 159.7 },
    { x: -136.3, z: 160 },
  ],
}

export const picnicLedge = {
  id: 'mirror-ledge',
  name: 'Mirror Lake Picnic Ledge',
  x: -104,
  z: 145,
  radius: 3.8,
  path: [
    { x: -99.7, z: 149.9 },
    { x: -100.4, z: 148.25 },
    { x: -102.1, z: 146.6 },
    { x: -102, z: 145.2 },
    { x: -102.4, z: 143.7 },
  ],
}

const barleycrossCenter = { x: 162, z: -65 } as const
const alderwatchCenter = { x: -56, z: 158 } as const

export const villages = [
  { id: 'brinewick', name: 'Brinewick', x: -270, z: -105, detail: 'The ferry, fish market, boat ramp and lifeboat quay.' },
  { id: 'barleycross', name: 'Barleycross', ...barleycrossCenter, detail: 'A farmers market and field lanes on the sunny side of the island.' },
  { id: 'alderwatch', name: 'Alderwatch', ...alderwatchCenter, detail: 'A hillside village between a tarn, the timber yard and the slate mine.' },
] as const

export const biomes = [
  { name: 'Brinewick Coast', x: -303, z: -221, color: '#e5bc81' },
  { name: 'Reedwater Valley', x: -239, z: 62, color: '#86a970' },
  { name: 'Barley Meadows', x: 194, z: 18, color: '#afba68' },
  { name: 'Alder Crown', x: -178, z: 231, color: '#628854' },
  { name: 'East Bluff', x: 300, z: 96, color: '#879659' },
] as const

export interface SiteLayout extends MapPoint {
  id: string
  name: string
  y: number
  width: number
  depth: number
  assets: string
  access: MapPoint
  stop: MapPoint | 'market' | 'school' | 'dispatch'
  heading: number
}

const quarterTurn = Math.PI / 2

// Width/depth are level site reserves. Stops are vehicle origins, in metres.
export const siteLayouts = [
  {
    id: 'ferry',
    name: 'Brinewick Ferry',
    ...ferryDeck,
    y: 4,
    width: 38,
    depth: 57,
    assets: 'Ferry, vehicle ramp and bollards',
    access: { x: -274, z: -204 },
    stop: ferryDeck,
    heading: 0,
  },
  {
    id: 'fish-market',
    name: 'Fish Market',
    x: -237,
    z: -126,
    y: 8.6,
    width: 52,
    depth: 56,
    assets: 'Fish hall, awning, crates and delivery apron',
    access: { x: -244, z: -105 },
    stop: { x: -222, z: -125 },
    heading: 0,
  },
  {
    id: 'police',
    name: 'Police Station',
    x: -247,
    z: -74,
    y: 9.5,
    width: 37,
    depth: 36,
    assets: 'Station, marked apron and parked patrol car',
    access: { x: -249, z: -103 },
    stop: { x: -237, z: -82 },
    heading: Math.PI,
  },
  {
    id: 'apartments',
    name: 'Quay Apartments',
    x: -303,
    z: -138,
    y: 7.5,
    width: 32,
    depth: 30,
    assets: 'Three-storey apartments with porches',
    access: { x: -300, z: -106 },
    stop: { x: -298, z: -130 },
    heading: 0,
  },
  {
    id: 'grocery',
    name: 'Brinewick Grocery',
    x: -313,
    z: -77,
    y: 10,
    width: 40,
    depth: 32,
    assets: 'Grocery and delivery reserve',
    access: { x: -315, z: -103 },
    stop: { x: -302, z: -78 },
    heading: Math.PI,
  },
  {
    id: 'farmers-market',
    name: 'Farmers Market',
    x: 166,
    z: -35,
    y: 13.55,
    width: 64,
    depth: 45,
    assets: 'Covered market, stalls, crates and delivery apron',
    access: barleycrossCenter,
    stop: 'market',
    heading: Math.PI,
  },
  {
    id: 'fields',
    name: 'Long Acre Fields',
    x: 140,
    z: 31,
    y: 17,
    width: 118,
    depth: 70,
    assets: 'Planted crop rows and field access',
    access: { x: 234, z: 35 },
    stop: { x: 189, z: 33 },
    heading: -quarterTurn,
  },
  {
    id: 'school',
    name: 'Barleycross School',
    x: 264,
    z: -33,
    y: 13,
    width: 47,
    depth: 42,
    assets: 'Schoolhouse and sheltered entry',
    access: { x: 233, z: -26 },
    stop: 'school',
    heading: -quarterTurn,
  },
  {
    id: 'hospital',
    name: 'Saltwind Hospital',
    x: 116,
    z: 113,
    y: 23,
    width: 72,
    depth: 47,
    assets: 'Hospital, helipad and ambulance pull-through',
    access: { x: 116, z: 141 },
    stop: { x: 136, z: 113 },
    heading: 0,
  },
  {
    id: 'church',
    name: 'Alderwatch Church',
    x: -23,
    z: 188,
    y: 30,
    width: 33,
    depth: 32,
    assets: 'Chapel, steeple and entry steps',
    access: { x: -26, z: 154 },
    stop: { x: -14, z: 181 },
    heading: Math.PI,
  },
  {
    id: 'cemetery',
    name: 'Alderwatch Cemetery',
    x: cemeteryCentreX,
    z: cemeteryCentreZ,
    y: 30,
    width: 43,
    depth: 36,
    assets: 'Stone wall, gate and headstones',
    access: { x: 20, z: 150 },
    stop: { x: 26, z: 173 },
    heading: 0,
  },
  {
    id: 'fire',
    name: 'Alderwatch Fire Station',
    x: -57,
    z: 188,
    y: 29.7,
    width: 34,
    depth: 43,
    assets: 'Two-bay station, drill tower and engine apron',
    access: alderwatchCenter,
    stop: { x: -59, z: 177 },
    heading: Math.PI,
  },
  {
    id: 'timber',
    name: 'Alder Timber Works',
    x: -227,
    z: 155,
    y: 30,
    width: 70,
    depth: 60,
    assets: 'Sawmill, log yard and bunks',
    access: { x: -236, z: 127 },
    stop: { x: -226, z: 153 },
    heading: 0,
  },
  {
    id: 'mine',
    name: 'Slatecliff Mine',
    x: 266,
    z: 160,
    y: 29,
    width: 67,
    depth: 63,
    assets: 'Portal and ore hopper. Qualified Starter Island drivers can collect a freight contract at the truck bay',
    access: { x: 269, z: 153 },
    stop: 'dispatch',
    heading: quarterTurn,
  },
  {
    id: 'airport',
    name: 'Saltwind Airstrip',
    x: 187,
    z: -126,
    y: 8,
    width: 116,
    depth: 44,
    assets: 'Runway, taxiway, apron, hangar and windsock',
    access: { x: 219, z: -128 },
    stop: { x: 183, z: -132 },
    heading: Math.PI,
  },
] as const satisfies readonly SiteLayout[]

export const waterfront = {
  fishing: { x: -253, z: -260 },
  rescue: { x: -311, z: -225 },
  skiffLaunch: { x: -311, z: -239 },
}

const bridgeMarkerRadius = 33
export const surveyLandmarks = [
  { id: 'reedwater', name: 'Reedwater Bridge', x: -351, z: 12, radius: bridgeMarkerRadius },
  { id: 'mill-bridge', name: 'Mill Bridge', x: -204, z: 53, radius: bridgeMarkerRadius },
  { id: 'tarn-bridge', name: 'Tarnstep Viaduct', x: -124, z: 153, radius: bridgeMarkerRadius },
  { id: 'lake', name: 'Mirror Lake', x: -84, z: 104, radius: 72 },
] as const

// Dimensions are X/Z footprints. The runway, taxiway, and apron share a pavement height.
const runwayPavingTop = runway.y + 0.07
export const pavedYards = [
  { id: 'quay', x: -274, y: 4.10, z: -208, width: 29, depth: 34 },
  { id: 'fish-market', x: -223, y: 8.70, z: -128, width: 21, depth: 33 },
  { id: 'farmers-market', x: 182, y: 13.65, z: -37, width: 26, depth: 31 },
  { id: 'police', x: -238, y: 9.60, z: -79, width: 10, depth: 19 },
  { id: 'fire', x: -59, y: 29.80, z: 179.5, width: 24, depth: 21 },
  { id: 'hospital', x: 136, y: 23.10, z: 121.5, width: 22, depth: 23 },
  { id: 'timber', x: -222, y: 30.10, z: 157, width: 33, depth: 35 },
  { id: 'runway', x: runway.x, y: runwayPavingTop, z: runway.z, width: runway.length, depth: runway.width },
  { id: 'taxi', x: 219, y: runwayPavingTop, z: -146.5, width: 11, depth: 9 },
  { id: 'air-apron', x: 187, y: runwayPavingTop, z: -133, width: 84, depth: 18 },
] as const
export const roundYards = [
  { id: 'helipad', ...helipad, y: 23.18 },
  { id: 'mine', x: 286, z: 164, radius: 16, y: 29.16 },
] as const

export const saltwindFeatureSites = [
  { site: 'ferry', name: 'Ferry passenger waiting shelter', model: 'shelter', color: '#9b6451', x: -264.5, z: -225, heading: Math.PI / 2 },
  { site: 'apartments', name: 'Quay apartments herb boxes', model: 'planter', color: '#f3bc72', x: -312.3, z: -134.5 },
  { site: 'grocery', name: 'Grocery produce display', model: 'crates', color: '#8ea456', x: -323.3, z: -83.6 },
  { site: 'farmers-market', name: 'Farmers market produce display', model: 'crates', color: '#ce8354', x: 145, z: -41 },
  { site: 'fields', name: 'Long Acre rain barrels', model: 'barrels', color: '#789a83', x: 178.4, z: 31.7 },
  { site: 'school', name: 'Schoolyard reading bench', model: 'bench', color: '#dca752', x: 258.5, z: -41, heading: Math.PI / 2 },
  { site: 'hospital', name: 'Hospital garden planter', model: 'planter', color: '#9fc8a6', x: 126.2, z: 112.8 },
  { site: 'alderwatch', name: 'Alderwatch village bench', model: 'bench', color: '#7f8c6b', x: -40, z: 165.3 },
  { site: 'church', name: 'Chapel garden planter', model: 'planter', color: '#dda2a1', x: -29, z: 181.5 },
  { site: 'cemetery', name: 'Cemetery remembrance bench', model: 'bench', color: '#778678', x: 25, z: 179, heading: Math.PI },
  { site: 'fire', name: 'Fire station hose rack', model: 'hose', color: '#c5634d', x: -69.6, z: 184.3 },
  { site: 'fishing', name: 'Sandspit float rack', model: 'rack', color: '#d99149', x: -249.1, z: -257.5, heading: Math.PI / 2, scale: 1.1 },
  { site: 'rescue', name: 'Rescue slip lifebuoy', model: 'lifebuoy', color: '#c97653', x: -303.3, z: -224, heading: Math.PI / 2 },
  { site: picnicLedge.id, name: 'Mirror Lake slate picnic seat', model: 'picnic', color: '#bf7860', x: picnicLedge.x, z: picnicLedge.z, heading: -0.48 },
  { site: viaductWalk.id, name: 'Tarnstep triangulation benchmark', model: 'benchmark', color: '#729585', heading: 0.61, x: viaductWalk.x, z: viaductWalk.z },
] as const
