export const harborRoadLayout = {
  rampStemZ: -10,
  inland: [{ x: 10, z: 12 }, { x: 51, z: 12 }],
  trim: 9.5,
} as const

export const depotLaneStart = { x: -55, z: -11 }
export const shellglassPoint = { x: 43.2, z: -31.4 }
export const splitstone = { x: 53.5, z: -20.8 }

export const starterTrailLayout = {
  meadow: { name: 'Meadow slope path', width: 1.35, surface: 'desire', start: { x: -27, z: 8 }, rise: { x: -26.6, z: 17 }, trim: 1.8 },
  beach: { name: 'Beach trail', width: 2.6, surface: 'pavement', approach: [{ x: 35, z: 12 }, { x: 33.1, z: 4 }, { x: 29.6, z: -24.7 }], trim: 4 },
  juniper: {
    name: 'Juniper trail',
    width: 1.2,
    surface: 'desire',
    trim: 2,
    points: [
      { x: -48.55, z: -10.9 },
      { x: -48.55, z: -0.8 },
      { x: -49, z: 9 },
      { x: -52, z: 21 },
      { x: -54, z: 33 },
      { x: -54.5, z: 52 },
      { x: -54.5, z: 65.9 },
      { x: -53.45, z: 68 },
      { x: -54.5, z: 70 },
      { x: -54.8, z: 73 },
      { x: -54.65, z: 75.9 },
    ],
  },
  lookout: { name: 'Lookout trail', surface: 'gravel', width: 3.2, approach: [{ x: 17, z: 12 }, { x: 20, z: 22 }], trim: 4 },
  harbor: { name: 'Harbor trail', surface: 'gravel', width: 3.1, start: { x: -46, z: -11 }, end: { x: -44, z: -30 }, trim: 3 },
  splitstone: {
    name: 'Splitstone strand',
    surface: 'desire',
    width: 0.85,
    trim: 1,
    points: [{ x: 41.7, z: -30.2 }, { x: 44.1, z: -29.05 }, { x: 45.85, z: -28.25 }],
  },
  driftwood: {
    name: 'Driftwood shore walk',
    surface: 'desire',
    width: 1.1,
    trim: 1.1,
    points: [{ x: 30.1, z: -24.7 }, { x: 34.7, z: -26.3 }, { x: 39, z: -29.2 }, { x: 42.6, z: -30.68 }],
  },
} as const

const sidewalkWidth = 1.55
const northZ = 15.76
const southZ = 8.24
const northEdge = northZ + sidewalkWidth / 2
const southEdge = southZ - sidewalkWidth / 2
export const seabrookWalkLayout = {
  fixed: [
    { name: 'North Seabrook pavement', width: sidewalkWidth, points: [{ x: 30, z: northZ }, { x: 51, z: northZ }] },
    { name: 'South Seabrook pavement', width: sidewalkWidth, points: [{ x: 31, z: southZ }, { x: 51, z: southZ }] },
    { name: 'South house walk', width: 1.5, points: [{ x: 39, z: southEdge }, { x: 39, z: 5.28 }] },
    { name: 'East house walk', width: 1.4, points: [{ x: 48, z: southEdge }, { x: 48, z: 5.28 }] },
  ],
  northHouses: { width: 1.1, firstZ: northEdge, doors: [{ x: 35, z: 19.32 }, { x: 43, z: 19.32 }, { x: 50, z: 19.22 }] },
}
