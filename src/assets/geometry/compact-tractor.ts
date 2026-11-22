// Island Farm compact tractor, the slow first step toward farm machinery.
// Model origin is on the ground, +Z forward, +Y up, +X right.

const rearAxle = -0.55
const frontAxle = 1.05
const rearRadius = 0.58
const nose = 1.6
const deck = 0.64
const ropsZ = -1.02
const ropsTop = 2.1

export const compactTractorSpec = {
  name: 'Island Farm tractor',
  width: 1.64,
  length: 3.2,
  // Body center along Z (hitch to front weights), for the walking footprint.
  centerZ: 0.17,
  height: ropsTop + 0.12,
  // Physics wheels share the rear radius; the front tires are drawn smaller.
  wheelRadius: rearRadius,
  halfTrack: 0.66,
  axles: [rearAxle, frontAxle],
  rearTire: { depth: 0.32 },
  frontTire: { radius: 0.36, depth: 0.2, halfTrack: 0.52 },
} as const

export const compactTractorBody = {
  finish: '#5b8c45',
  chassis: { center: [0, 0.52, 0.45], size: [0.5, 0.2, 2.3] },
  frontAxleBeam: { center: [0, 0.36, frontAxle], size: [0.96, 0.1, 0.12] },
  hood: {
    halfWidth: 0.33,
    profile: [[0.05, 0.62], [1.46, 0.62], [nose, 0.78], [nose, 1.08], [1.48, 1.18], [0.05, 1.18]],
  },
  louvers: { x: 0.334, y: 0.96, z: [0.55, 0.72, 0.89, 1.06], size: [0.01, 0.2, 0.07] },
  stripe: { center: [0.333, 1.1, 0.8], size: [0.01, 0.04, 1.3] },
  grille: {
    surround: { center: [0, 0.93, nose + 0.01], size: [0.3, 0.26, 0.03] },
    bar: { heights: [0.86, 0.93, 1.0], z: nose + 0.03, size: [0.24, 0.02, 0.02] },
  },
  headlightHousing: { x: 0.24, center: [0, 1.0, nose + 0.01], size: [0.15, 0.13, 0.03] },
  weightBracket: { center: [0, 0.62, nose + 0.08], size: [0.56, 0.2, 0.16] },
  exhaust: { center: [0.2, 1.42, 1.25], diameter: 0.07, height: 0.5, segments: 8, cap: { diameter: 0.09, height: 0.04 } },
  cowl: { center: [0, 1.1, -0.02], size: [0.62, 0.3, 0.2] },
  steering: {
    column: { center: [0, 1.32, -0.12], size: [0.05, 0.36, 0.05], tilt: -0.5 },
    wheel: { center: [0, 1.5, -0.22], diameter: 0.38, thickness: 0.03, segments: 14, tilt: -1.05 },
  },
  platform: { center: [0, deck, -0.35], size: [1.0, 0.04, 0.8] },
  seat: {
    post: { center: [0, 0.8, -0.62], size: [0.1, 0.3, 0.1] },
    pan: { center: [0, 0.98, -0.62], size: [0.46, 0.1, 0.42] },
    back: { center: [0, 1.22, -0.84], size: [0.42, 0.44, 0.1], rake: -0.2 },
  },
  // A thin mudguard arches over each rear tire as a run of flat plates. Neighbors
  // alternate in width so their overlapping side faces never share a plane.
  fender: { x: 0.66, axle: [rearAxle, rearRadius], radius: 0.7, angles: [0.42, 0.9, 1.35, 1.79, 2.24, 2.72], plate: [0.4, 0.04, 0.36], narrowerBy: 0.02 },
  rops: {
    posts: { x: [-0.6, 0.6], center: [0, (deck + ropsTop) * 0.5, ropsZ], size: [0.07, ropsTop - deck, 0.07] },
    // The top bar is deeper than the posts so their faces never coincide.
    bar: { center: [0, ropsTop, ropsZ], size: [1.31, 0.07, 0.09] },
    // A lower rail between the posts carries the slow-vehicle sign.
    signRail: { center: [0, 1.55, ropsZ], size: [1.2, 0.05, 0.05] },
    beacon: { center: [0, ropsTop + 0.07, ropsZ], size: [0.12, 0.08, 0.12] },
    slowSign: { center: [0, 1.55, ropsZ - 0.04], size: [0.22, 0.22, 0.02], turn: 0.785 },
  },
  hitch: {
    // The lower arms and drawbar run back from the chassis end.
    arms: { x: [-0.25, 0.25], center: [0, 0.5, -0.95], size: [0.06, 0.06, 0.5] },
    drawbar: { center: [0, 0.47, -1.06], size: [0.12, 0.06, 0.72] },
  },
  tailLightHousing: { x: 0.66, center: [0, 0.98, -1.2], size: [0.14, 0.1, 0.05] },
} as const

export const compactTractorLights = {
  head: { x: 0.24, y: 1.0, z: nose + 0.03, size: [0.1, 0.08, 0.02] },
  tail: { x: 0.66, y: 0.98, z: -1.23, size: [0.1, 0.07, 0.02] },
} as const

// Lugs alternate across the tread, as on a farm tire.
export const tractorTread = { count: 16, lateral: 0.25, size: [0.42, 0.05, 0.1] } as const
export const tractorRim = { diameterPerRadius: 1.1, standoff: 0.015, depth: 0.04, hubRatio: 0.45, capRatio: 0.22, segments: 14 } as const

export const compactTractorColliders = [
  { center: [0, 0.9, 0.55], size: [0.7, 0.6, 2.2] },
  { center: [0, 0.9, -0.55], size: [1.6, 0.7, 1.3] },
] as const
