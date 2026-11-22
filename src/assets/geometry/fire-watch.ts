// Fire Watch tower in tower-local metres. The cab deck is centred on the origin and the stair block
// runs toward local -z. Each flight is a straight ramp of treads between two landings, and no walking
// surface lies above another, so walking can read the whole tower as one height field.

export type FireWatchArea = readonly [minX: number, maxX: number, minZ: number, maxZ: number]

interface Flight {
  area: FireWatchArea
  // Surface height at the area's minimum and maximum z.
  rise: readonly [atMinZ: number, atMaxZ: number]
}

const deckTop = 7.2
const flightRise = 2.4
const deckHalf = 2.2
const flightWidth = 1.35
const railGap = 0.15
const stairNorthZ = -deckHalf
const landingDepth = 1.3
const flightRun = 3.6
const flightNorthZ = stairNorthZ - landingDepth
const flightSouthZ = flightNorthZ - flightRun
const stairSouthZ = flightSouthZ - landingDepth
const eastFlightX = deckHalf - flightWidth / 2
const eastInnerX = eastFlightX - flightWidth / 2 - railGap / 2
const westInnerX = -eastInnerX
const firstLanding = flightRise
const secondLanding = flightRise * 2

export const fireWatchGeometry = {
  deck: { top: deckTop, area: [-deckHalf, deckHalf, -deckHalf, deckHalf] as FireWatchArea, thickness: 0.18 },
  flights: [
    // East flight climbs north from the ground.
    { area: [eastInnerX, deckHalf, flightSouthZ, flightNorthZ], rise: [0, firstLanding] },
    // Middle flight climbs back south.
    { area: [westInnerX, eastInnerX, flightSouthZ, flightNorthZ], rise: [secondLanding, firstLanding] },
    // West flight climbs north to the deck.
    { area: [-deckHalf, westInnerX, flightSouthZ, flightNorthZ], rise: [secondLanding, deckTop] },
  ] satisfies readonly Flight[],
  landings: [
    { area: [westInnerX, deckHalf, flightNorthZ, stairNorthZ], top: firstLanding },
    { area: [-deckHalf, eastInnerX, stairSouthZ, flightSouthZ], top: secondLanding },
    { area: [-deckHalf, westInnerX, flightNorthZ, stairNorthZ], top: deckTop },
  ] as const,
  // Where a crewmate steps onto the first tread, in front of the east flight.
  entrance: { x: eastFlightX, z: stairSouthZ - 0.6 },
  stairOuter: [-deckHalf, deckHalf, stairSouthZ, stairNorthZ] as FireWatchArea,
  treadRise: 0.2,
  tread: { thickness: 0.06, nosing: 0.03 },
  stringer: { width: 0.09, depth: 0.28 },
  // Rails stand above the higher floor they guard. Collision uses a taller rail than the model so a
  // jump cannot clear it.
  rail: { height: 1.05, collisionHeight: 1.9, collisionThickness: 0.16, thickness: 0.07, post: 0.09, postSpacing: 1.2 },
  // [x1, z1, x2, z2] runs between floors at different heights.
  rails: [
    [eastInnerX, flightSouthZ - landingDepth, eastInnerX, flightNorthZ],
    [westInnerX, flightSouthZ, westInnerX, stairNorthZ],
    [deckHalf, flightSouthZ, deckHalf, stairNorthZ],
    [-deckHalf, stairSouthZ, -deckHalf, stairNorthZ],
    [-deckHalf, stairSouthZ, eastInnerX, stairSouthZ],
    [westInnerX, stairNorthZ, deckHalf, stairNorthZ],
    [-deckHalf, deckHalf, deckHalf, deckHalf],
    [deckHalf, -deckHalf, deckHalf, deckHalf],
    [-deckHalf, -deckHalf, -deckHalf, deckHalf],
  ] as const,
  legs: { size: 0.26, inset: 0.18, splay: 0.45 },
  braceLevels: [1.4, 3.3, 5.3] as const,
  brace: { size: 0.11 },
  stairPosts: { size: 0.18 },
  cab: {
    postSize: 0.14,
    sillHeight: 1.0,
    windowHeight: 1.15,
    roofHeight: 2.45,
    roofOverhang: 0.35,
    roofRise: 1.5,
    wallThickness: 0.08,
    lintel: 0.16,
  },
  finder: { pedestal: [0.36, 1.0, 0.36], top: [0.95, 0.1, 0.95], ring: 0.62, sight: [0.05, 0.22, 0.05] },
  flag: { pole: 0.05, height: 2.1, cloth: [0.62, 0.38] },
  colors: {
    timber: '#8b6746',
    timberShade: '#685647',
    tread: '#aa8562',
    rail: '#e4d2b0',
    cabWall: '#ece5cf',
    cabTrim: '#fff1c8',
    roof: '#3f5d5a',
    finder: '#c08b3e',
    finderTop: '#e9d39a',
    flag: '#c06048',
  },
} as const
