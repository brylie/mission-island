export type RouteKnot = readonly [x: number, z: number, y: number]

export interface RouteLayout {
  name: string
  width: number
  knots: readonly RouteKnot[]
  closed?: boolean
  crossings?: boolean
}

interface AccessLaneLayout extends RouteLayout {
  join: readonly [x: number, z: number]
}

// Waypoints and elevations are in metres. Route order is used to layer surfaces at junctions.
export const islandLoopLayout = {
  name: 'Saltwind Loop',
  width: 9,
  closed: true,
  crossings: true,
  knots: [
    [-270, -105, 9],
    [-244, -105, 9],
    [-185, -87, 11],
    [-111, -74, 12],
    [18, -66, 13],
    [109, -65, 13],
    [162, -65, 13],
    [205, -55, 13],
    [233, -26, 14],
    [235, 7, 15.5],
    [234, 35, 17],
    [231, 69, 19],
    [213, 101, 21],
    [168, 127, 23],
    [116, 141, 24],
    [20, 150, 28],
    [-26, 154, 29],
    [-56, 158, 29],
    [-108, 153, 31],
    [-172, 150, 31],
    [-236, 127, 29.7],
    [-259, 114, 28],
    [-297, 88, 24],
    [-337, 55, 18.6],
    [-351, 15, 14.4],
    [-353, -31, 11.7],
    [-342, -76, 10],
    [-315, -99, 9.5],
    [-296, -105, 9],
  ],
} as const satisfies RouteLayout

export const ferryApproachLayout = {
  name: 'Ferry Approach',
  width: 9,
  knots: [
    [-274, -229, 4],
    [-274, -210, 4],
    [-274, -177, 6],
    [-272, -139, 8],
    [-270, -105, 9],
  ],
} as const satisfies RouteLayout

export const connectingRoadLayouts = [
  {
    name: 'Mill Road',
    width: 8,
    crossings: true,
    knots: [
      [-185, -87, 11],
      [-174, -57, 13],
      [-174, -21, 15.6],
      [-190, 17, 19.2],
      [-210, 69, 24],
      [-224, 92, 26.2],
      [-241, 104, 27.1],
      [-259, 114, 28],
    ],
  },
  {
    name: 'Slatecliff Road',
    width: 8,
    knots: [[213, 101, 21], [233, 112, 23.1], [252, 130, 25.65], [264, 148, 28.1], [271, 165, 29.12], [274, 172, 29.12]],
  },
  {
    name: 'Airfield Lane',
    width: 7,
    knots: [[162, -65, 13], [186, -71, 12.85], [205, -88, 11.2], [215, -108, 9.2], [219, -128, 8]],
  },
  {
    name: 'Fishing Pier Lane',
    width: 6,
    knots: [[-274, -210, 4], [-260, -214, 4.05], [-252, -232, 2.8], [-253, -253, 1.6]],
  },
  {
    name: 'Rescue Slip Lane',
    width: 7,
    knots: [[-274, -210, 4], [-290, -209, 4], [-305, -215, 2.8], [-311, -225, 1.6], [-311, -243, -1.8]],
  },
] as const satisfies readonly RouteLayout[]

// The join finds the nearest sampled point on the Loop. The knots continue into the site.
export const accessLaneLayouts = [
  { name: 'Fish Market Delivery', width: 6.4, join: [-222, -100], knots: [[-222, -107, 9.23], [-222, -119, 8.55]] },
  { name: 'Farmers Market Delivery', width: 6.4, join: [182, -63], knots: [[183, -56, 13.27], [183, -47, 13.51]] },
  { name: 'Hospital West Access', width: 6.4, join: [113, 141], knots: [[120, 136, 23.67], [130, 129, 23.05]] },
  { name: 'Hospital East Access', width: 6.4, join: [161, 130], knots: [[153, 128, 23.22], [143, 127, 23.05]] },
  { name: 'Fire Station West Access', width: 6.2, join: [-65, 158], knots: [[-66, 165, 29.46], [-66, 175, 29.65]] },
  { name: 'Fire Station East Access', width: 6.2, join: [-49, 157], knots: [[-51, 164, 29.29], [-51, 169, 29.63], [-51, 175, 29.65]] },
] as const satisfies readonly AccessLaneLayout[]

export const fishingPierLayout = {
  name: 'Fishing Pier',
  width: 4.5,
  knots: [[-253, -253, 1.6], [-253, -271, 1.6]],
} as const satisfies RouteLayout

export const ferryDeckLayout = {
  name: 'Ferry Deck',
  width: 8,
  knots: [[-274, -266, 1.65], [-274, -254, 1.65], [-274, -246, 2.12], [-274, -236, 3.3], [-274, -229, 4]],
} as const satisfies RouteLayout
