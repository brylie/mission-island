export const netShedHouse = { x: 0, z: 0, w: 3.9, d: 3.0, h: 2.65, wall: '#ae634d', roof: '#496661' } as const

export const netDryingFrame = {
  x: 2.36,
  bottom: 0.49,
  height: 1.16,
  width: 2.8,
  timber: '#ba946a',
  posts: { z: [-1.42, 1.42], y: 1.03, size: [0.105, 2.06, 0.105] },
  braces: { x: 2.13, y: 1.88, size: [0.52, 0.10, 0.13], finish: '#775d49' },
  rails: { thickness: 0.081, height: 0.083, lengthOverhang: 0.13 },
  twine: { spacing: 0.32, faceOffset: 0.008, diameter: 0.017, segments: 5, finish: '#697b68' },
  corks: {
    count: 7,
    firstZ: -0.99,
    spacing: 0.33,
    faceOffset: 0.033,
    drop: 0.045,
    size: [0.115, 0.15, 0.12],
    tilt: 0.17,
    segments: 4,
    finish: '#dba269',
  },
} as const

export const netShedGable = {
  boards: { x: 1.968, y: 1.40, first: -3, last: 3, spacing: 0.39, size: [0.044, 2.37, 0.045], finish: '#bb7359' },
  vent: { backing: [2.092, 2.90, 0, 0.052, 0.45, 0.64], finish: '#425553', slats: { x: 2.129, y: [2.78, 2.89, 3.00], size: [0.071, 0.048, 0.57] } },
} as const
