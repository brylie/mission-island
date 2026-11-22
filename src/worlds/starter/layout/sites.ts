export const ridgeViewpoint = { x: 36.5, z: 134 }
export const ridgeLichenSite = { x: 40.2, z: 131.1 }
export const ridgeLichenRocks = [[0, 0, 2.85], [-1.3, 0.78, 1.25], [0.95, 0.71, 0.83]] as const
export const mirrorPoolWillow = { x: 44.5, z: 106 }
export const shellglassStaff = { x: 44.65, z: -31.45 }
export const driftwoodWrack = { x: 42.6, z: -30.99 }
export const driftwoodFoxgloves = [
  { x: 40.4, z: -28.45 },
  { x: 39.9, z: -28.18 },
  { x: 40.78, z: -28.25 },
  { x: 40.25, z: -27.95 },
  { x: 41, z: -28.02 },
]
export const shellglassLimpets = [
  { x: 45.62, z: -31.27 },
  { x: 45.75, z: -31.34 },
  { x: 45.86, z: -31.25 },
]

export const starterSiteProps = [
  { site: 'harbor', name: 'Depot freight stack', model: 'crates', color: '#d99752', x: -52.5, z: -17.8 },
  { site: 'amber-home', name: 'Amber cottage herb box', model: 'planter', color: '#f1b35a', x: -53.26, z: -7.15, scale: 0.8 },
  { site: 'blue-home', name: 'Blue cottage flower box', model: 'planter', color: '#8ed1c7', x: -46.3, z: -7.15, scale: 0.8 },
  { site: 'dock', name: 'Fishing net drying rack', model: 'rack', color: '#ef9856', x: -42.67, z: -30.9, heading: Math.PI / 2, scale: 0.8 },
  { site: 'town', name: 'Seabrook village bench', model: 'bench', color: '#53a197', x: 39, z: 17.65 },
  { site: 'market', name: 'Market produce stack', model: 'crates', color: '#a4bd6a', x: 41.15, z: 5.86 },
  { site: 'farm', name: 'Farm rain barrels', model: 'barrels', color: '#6b9b96', x: 28.75, z: -10.9 },
  { site: 'lookout', name: 'Lookout viewing scope', model: 'scope', color: '#deb77b', x: 5.42, z: 32.6, heading: 0.7 },
  { site: 'juniper', name: 'Juniper trail cairn', model: 'cairn', color: '#658476', x: -55.5, z: 66 },
  { site: 'fernfall', name: 'Fernfall stream gauge', model: 'gauge', color: '#719caa', x: 8.5, z: 82 },
  { site: 'pool', name: 'Mirror Pool fallen willow', model: 'log', color: '#80705b', heading: Math.PI / 2, ...mirrorPoolWillow },
  { site: 'ridge', name: 'Windstone survey scope', model: 'scope', color: '#e9af62', heading: -0.8, ...ridgeViewpoint },
] as const

export const tideStaffFeature = { site: 'shellglass', name: 'Mended Shellglass tide staff', model: 'tide-staff', color: '#6caca6', heading: Math.PI, scale: 0.72, ...shellglassStaff } as const
export const splitstoneFeature = { site: 'splitstone', name: 'Splitstone sandstone cleft', model: 'splitstone', color: '#a78c6d' } as const
export const beachUmbrellaSites = [{ x: 26, z: -39.6 }, { x: 33, z: -37.7 }, { x: 38.1, z: -35.3 }]
export const lampPostSites = [{ x: -55, z: -7.1 }, { x: -39, z: -7.1 }, { x: 34, z: 17.45 }, { x: 46.5, z: 6.45 }]
export const shellRockSites = [[0.63, -0.98, 0.68, 0.9], [1.14, -1.55, 0.41, 1.6], [0.05, -1.36, 0.43, -1.1]] as const

export const starterDecorationOffsets = {
  wardrobeZ: 0.49,
  clothingCounterZ: -0.65,
  depotRoad: { width: 6, lift: -0.003, markingEndX: -4 },
} as const

export const starterResidentSites = {
  bram: {
    officeDoor: { x: -50, z: -18.9 },
    depotLaneCorner: { x: -46, z: -17.8 },
    tallyOffset: { x: 2.5, z: -0.5 },
    stagingBay: { x: -52.5, z: -16 },
  },
  ines: {
    porch: { x: 43, z: 18.7 },
    squareCorner: { x: 42, z: 12 },
    stall: { x: 35.8, z: 7.2 },
  },
  mara: {
    porch: { x: -38.6, z: -24 },
    dock: { lateralInset: 0.7, landingZ: -28.4, fishingZ: -33.4 },
  },
}

export const starterHouseholdHours = {
  mara: { goesIn: 19, bedtime: 21, wakes: 5.25 },
  wren: { goesIn: 18.75, bedtime: 21.5, wakes: 6.25, stepsOut: 6.6 },
  ines: { goesIn: 19.75, bedtime: 22.5, wakes: 6.5 },
  bram: { goesIn: 18, bedtime: 20.5, wakes: 5.75 },
} as const

// Small, marked pickups sit off the paths. The edging runs just outside the east shoulder of Harbor Depot road,
// between Wren's mending bench and the ferry freight yard.
export const materialSources = {
  timber: { x: -27.9, z: 12.5, name: 'Marked windfall', landmark: 'Meadow Slope Path' },
  stone: { x: 45.5, z: -27, name: 'Loose surface stone', landmark: 'Splitstone Strand' },
} as const

export const sampleTray = { x: -22.2, z: -18 }
export const repairSite = { x: -25.5, z: -17.6, name: 'Ferry Approach Edging' }
export const repairChoices = {
  timber: { x: -24.4, z: -18.6 },
  stone: { x: -24.4, z: -17.2 },
} as const
export const edgingSections = [{ x: -25.99, z: -18.24 }, { x: -25.86, z: -17 }] as const

export const ridgeCourseLayout = {
  launch: { x: 39, z: 128 },
  launchClearance: 0.65,
  meadow: { x: 61, z: 102 },
  returnTrail: { x: 48, z: 116 },
  windSpeed: -0.35,
  landingRadius: 6.6,
  approach: { halfWidth: 7, start: -17 },
  rack: { x: 2.85, z: 0.6 },
  windsock: { x: -2.9, z: 2.85 },
  landingSign: { x: 6, z: -7 },
  updraft: { x: -10.5, z: 20, radius: 8.5, ceiling: 36, lift: 10 },
} as const

export const starterLiftSites = {
  fernfall: { id: 'fernfall-ledges', name: 'Fernfall ledges', kind: 'thermal', x: 17, z: 93, radius: 8, ceiling: 32, lift: 7 },
  juniper: { id: 'juniper-slope', name: 'Juniper slope', kind: 'ridge', x: -38, z: 62, radius: 9, ceiling: 30, lift: 8 },
  lookout: { id: 'lookout-clearing', name: 'Lookout clearing', kind: 'thermal', x: 4, z: -3, radius: 8, ceiling: 30, lift: 7 },
  town: { id: 'seabrook-roofs', name: 'Seabrook rooftops', kind: 'thermal', x: -4, z: 4, radius: 8.5, ceiling: 30, lift: 7 },
  farm: { id: 'farm-fields', name: 'Island Farm fields', kind: 'thermal', x: 3, z: 2, radius: 8, ceiling: 28, lift: 7 },
} as const

export const juniperClearing = {
  groveOffset: { x: -5, z: 9 },
  footprint: { logs: 1.26, trees: 1.12, stones: 0.9, grass: 0.3, clover: 0.26, animal: 0.24 },
  sightline: { centreRadius: 4.8, nearTrailZ: 1, halfWidth: 3.4 },
  spacing: 0.12,
  radius: 6.9,
} as const
