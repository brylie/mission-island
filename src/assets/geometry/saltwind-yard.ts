export const vehicleBayMarkings = {
  sideLine: { raise: 0.024, width: 0.14, thickness: 0.025 },
  endLine: { raise: 0.026, thickness: 0.025, depth: 0.14 },
} as const

export const yardSurfaces = {
  pavingThickness: 0.24,
  mineTurnaround: { thickness: 0.22, sides: 42 },
  helipad: { thickness: 0.18, sides: 40, color: '#677670' },
  helipadMarking: {
    upright: { x: 1.48, raise: 0.194, size: [0.41, 0.025, 4.8] },
    crossbar: { raise: 0.196, size: [2.9, 0.025, 0.44] },
  },
  helipadLights: { count: 12, radius: 8.1, raise: 0.2, size: [0.22, 0.06, 0.22], color: '#f1c679' },
} as const

export const timberStackGeometry = {
  courses: 3,
  bottomLogCount: 5,
  courseRise: 0.61,
  logSpacing: 0.76,
  log: { endDiameter: 0.74, buttDiameter: 0.82, length: 7.5, sides: 10, color: '#936b47' },
  endGrain: { z: 3.76, diameter: 0.61, thickness: 0.035, color: '#d4ad73' },
} as const

export const graveMarkerGeometry = {
  base: { centreY: 0.07, size: [0.98, 0.14, 0.48], color: '#989888' },
  slab: { rise: 0.1, width: 0.74, depth: 0.30, minHeight: 0.76, heightStep: 0.09, heightVariants: 3, color: '#8a9185' },
  crest: { size: [0.74, 0.27, 0.31], segments: 8 },
  pot: { x: 0.28, z: -0.4, centreY: 0.14, rim: 0.19, base: 0.14, height: 0.28, sides: 7, color: '#a58167' },
  flowers: {
    x: [-0.05, 0.05],
    stem: { centreY: 0.34, size: [0.022, 0.16, 0.022], color: '#778958' },
    blossom: { centreY: 0.44, size: [0.12, 0.10, 0.12], color: '#e1be92' },
  },
} as const

export const cemeteryWall = {
  sides: [0.55, 0.87, 28],
  front: [17.4, 0.87, 0.55],
  back: [38.4, 0.85, 0.56],
  color: '#a39c86',
} as const
