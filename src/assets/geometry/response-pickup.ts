// Seabrook Fire and Rescue crew-cab pickup, the first emergency vehicle a crew
// learns to drive. Model origin is on the ground, +Z forward, +Y up, +X right.

const half = 0.5
const nose = 2.45
const tail = -2.42
const wheelRadius = 0.4
const frontAxle = 1.45
const rearAxle = -1.5
const sill = 0.52
// Wheel wells keep a clear gap above the tires.
const wellTop = 0.88
const beltline = 1.1
const bodyHalfWidth = 0.96
const cabRear = -0.55
const cabFront = 0.95
const roofTop = 1.93
const bedFront = -0.62
const bedLip = 1.4
const rockerX = 0.92
const tailLightY = 0.98

export const responsePickupSpec = {
  name: 'Fire and Rescue pickup',
  width: 1.92,
  length: nose - tail,
  // Body center along Z, for the walking footprint.
  centerZ: (nose + tail) * half,
  height: 2.08,
  wheelRadius,
  halfTrack: 0.82,
  axles: [rearAxle, frontAxle],
  tireDepth: 0.3,
} as const

export const responsePickupBody = {
  finish: '#c64f41',
  frame: { center: [0, 0.48, 0], size: [1.1, 0.22, 4.4] },
  // The upper body runs nose to tail above the wells; rockers and corners close them.
  upperBody: {
    halfWidth: bodyHalfWidth,
    profile: [[tail, wellTop], [2.36, wellTop], [nose, 0.96], [nose, 1.02], [2.34, beltline], [tail, beltline]],
  },
  underbody: { halfWidth: 0.62, profile: [[tail + 0.1, 0.4], [nose - 0.1, 0.4], [nose - 0.1, wellTop], [tail + 0.1, wellTop]] },
  // Rockers and corners stand just inside the body sides and short of its ends,
  // so no two faces share a plane.
  rocker: { center: [rockerX, (sill + wellTop) * half, -0.025], size: [0.07, wellTop - sill, 1.95] },
  frontCorner: { center: [rockerX, 0.73, 2.2], size: [0.07, 0.34, 0.48] },
  rearCorner: { center: [rockerX, 0.73, -2.19], size: [0.07, 0.34, 0.42] },
  archLip: { x: 0.96, y: 0.9, z: [rearAxle, frontAxle], size: [0.1, 0.05, 0.92] },
  cab: {
    halfWidth: 0.92,
    profile: [[cabRear, 1.04], [cabFront, 1.04], [cabFront, 1.16], [0.55, 1.86], [cabRear + 0.05, 1.86], [cabRear, 1.8]],
  },
  roof: {
    halfWidth: 0.95,
    profile: [[cabRear - 0.03, 1.84], [0.55, 1.84], [0.62, 1.87], [0.55, roofTop], [cabRear, roofTop], [cabRear - 0.03, 1.9]],
  },
  windows: {
    rake: -0.519,
    front: { center: [0, 1.518, 0.763], size: [1.5, 0.62, 0.035] },
    wiper: { x: 0.36, center: [0, 1.227, 0.946], size: [0.5, 0.03, 0.03], sweep: -0.14 },
    rear: { center: [0, 1.52, cabRear - 0.015], size: [1.3, 0.4, 0.035] },
    doors: {
      centerX: 0.923,
      halfWidth: 0.009,
      front: [[-0.02, 1.2], [0.84, 1.2], [0.5, 1.78], [-0.02, 1.78]],
      rear: [[-0.47, 1.2], [-0.1, 1.2], [-0.1, 1.78], [-0.47, 1.78]],
    },
  },
  door: {
    seams: { x: 0.96, z: [-0.06, 0.92], y: 0.9, size: [0.012, 0.38, 0.02] },
    handles: { x: 0.97, z: [-0.18, 0.62], y: 1.03, size: [0.03, 0.04, 0.16] },
    stripe: { center: [0.963, 0.97, -0.6], size: [0.01, 0.08, 3.6] },
    // A cream shield with a red flame marks the Seabrook crew on each front door.
    shield: { centerX: 0.966, halfWidth: 0.006, profile: [[0.22, 0.76], [0.46, 0.76], [0.52, 0.86], [0.46, 1.0], [0.22, 1.0], [0.16, 0.86]] },
    flame: { centerX: 0.973, halfWidth: 0.004, profile: [[0.27, 0.79], [0.41, 0.79], [0.37, 0.88], [0.34, 0.97], [0.31, 0.88]] },
  },
  mirror: {
    mount: { center: [0.98, 1.25, 0.82], size: [0.12, 0.04, 0.04] },
    housing: { center: [1.06, 1.32, 0.82], size: [0.08, 0.2, 0.12] },
    glass: { center: [1.06, 1.32, 0.755], size: [0.065, 0.15, 0.015] },
  },
  runningBoard: { center: [1.0, 0.5, 0.18], size: [0.18, 0.05, 1.5] },
  lightBar: {
    base: { center: [0, roofTop + 0.035, 0.1], size: [1.2, 0.07, 0.26] },
    lens: { x: 0.36, center: [0, roofTop + 0.1, 0.1], size: [0.4, 0.1, 0.22] },
    clear: { center: [0, roofTop + 0.09, 0.1], size: [0.26, 0.08, 0.2] },
  },
  grille: {
    surround: { center: [0, 0.98, nose + 0.01], size: [0.82, 0.22, 0.04] },
    bar: { heights: [0.92, 0.98, 1.04], z: nose + 0.035, size: [0.72, 0.022, 0.022] },
  },
  headlightHousing: { center: [0.66, 0.99, nose + 0.01], size: [0.34, 0.2, 0.04] },
  indicator: { center: [0.88, 0.99, nose + 0.005], size: [0.08, 0.12, 0.04] },
  frontBumper: { center: [0, 0.62, nose + 0.05], size: [1.9, 0.16, 0.16] },
  pushBar: { x: [-0.36, 0.36], center: [0, 0.86, nose + 0.12], size: [0.06, 0.42, 0.06], rail: { center: [0, 1.05, nose + 0.12], size: [0.84, 0.06, 0.07] } },
  bed: {
    floor: { center: [0, beltline + 0.01, (tail + bedFront) * half], size: [1.7, 0.02, bedFront - tail - 0.06] },
    // Bed sides and tailgate stand a few millimetres proud of the body's tail.
    side: { centerX: 0.913, halfWidth: 0.05, profile: [[tail - 0.01, beltline - 0.02], [bedFront, beltline - 0.02], [bedFront, bedLip], [tail - 0.01, bedLip]] },
    railCap: { center: [0.91, bedLip + 0.02, (tail + bedFront) * half], size: [0.14, 0.04, bedFront - tail - 0.02] },
    headboard: { center: [0, (beltline + bedLip) * half, bedFront + 0.03], size: [1.72, bedLip - beltline, 0.06] },
    tailgate: { center: [0, (beltline + bedLip) * half, tail + 0.025], size: [1.71, bedLip - beltline + 0.04, 0.06] },
    tailgateHandle: { center: [0, 1.34, tail - 0.005], size: [0.28, 0.05, 0.03] },
    // A response locker spans the bed behind the cab; two spare extinguishers ride beside it.
    locker: { center: [0, 1.36, -1.0], size: [1.66, 0.5, 0.56] },
    lockerLid: { center: [0, 1.62, -1.0], size: [1.72, 0.03, 0.58] },
    lockerLatch: { x: [-0.4, 0.4], center: [0, 1.42, -1.29], size: [0.12, 0.08, 0.02] },
    extinguishers: { x: [-0.55, 0.55], y: 1.4, z: -1.62, diameter: 0.17, height: 0.56, segments: 10 },
    extinguisherCap: { diameter: 0.07, height: 0.08 },
    strap: { center: [0, 1.46, -1.62], size: [1.72, 0.04, 0.2] },
  },
  rear: {
    bumper: { center: [0, 0.58, tail - 0.06], size: [1.9, 0.16, 0.16] },
    lightHousing: { center: [0.86, tailLightY, tail - 0.01], size: [0.16, 0.34, 0.05] },
    amberLens: { center: [0.86, tailLightY - 0.12, tail - 0.04], size: [0.11, 0.07, 0.03] },
  },
} as const

export const responsePickupLights = {
  head: { x: 0.66, y: 1.0, z: nose + 0.035, size: [0.24, 0.13, 0.03] },
  tail: { x: 0.86, y: tailLightY + 0.05, z: tail - 0.04, size: [0.11, 0.18, 0.03] },
} as const

// Physics shapes, centered on the model origin. The driver sits on the left.
export const responsePickupColliders = [
  { center: [0, 0.78, 0], size: [1.9, 0.6, 4.8] },
  { center: [0, 1.48, 0.2], size: [1.82, 0.8, 1.5] },
  { center: [0, 1.36, -1.0], size: [1.7, 0.5, 0.56] },
] as const
