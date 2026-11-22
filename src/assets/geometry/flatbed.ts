const half = 0.5
const upperCab = { y: 1.75, z: 1.03, width: 2.36, height: 1.1, length: 1.52 } as const
const hoodWidth = 2.46
const chassisLength = 5.7

export const truckBed = { width: 2.28, length: 3.12, center: -1.39, top: 1.12 } as const
export const truckRoof = {
  width: upperCab.width,
  length: upperCab.length,
  center: upperCab.z,
  top: upperCab.y + upperCab.height * half,
} as const
export const truckHood = { width: hoodWidth, length: 1.07, center: 2.325, top: 1.43 } as const

const railThickness = 0.14
export const truckSideRails = { thickness: railThickness, height: 0.62, x: (truckBed.width - railThickness) * half } as const
const tailLipThickness = 0.12
export const truckTailLip = {
  thickness: tailLipThickness,
  height: 0.28,
  z: truckBed.center - (truckBed.length + tailLipThickness) * half,
} as const

// Cargo is offered the first open slot from the cab toward the tailgate.
export const cargoSlots = [-0.46, -1.46, -2.46] as const

// Suspension samples and the mesh rig share this rear/front axle order.
export const flatbedWheelLayout = { radius: 0.48, halfTrack: 1.2, axles: [-1.89, 1.87] } as const

// The cargo boxes approximate the visible body. The roof and hood above define
// the separate platforms a player can stand on.
export const flatbedCargoBoxes = {
  cab: { center: [0, 1.5, 1.05], size: [upperCab.width, 1.6, 1.6] },
  chassis: { center: [0, 0.74, 0], size: [truckBed.width, 0.5, chassisLength] },
  hood: { center: [0, 1.08, 2.3], size: [2.44, 0.7, 1.08] },
} as const

// The cab and bonnet keep the gameplay platforms above: the cream roof cap
// tops out at the roof height and the bonnet at the hood height.
const beltline = truckHood.top
const cabRear = upperCab.z - upperCab.length * half
const cabFront = upperCab.z + upperCab.length * half
const cabHalfWidth = upperCab.width * half
const bonnetHalfWidth = hoodWidth * half
const noseZ = 2.87
const windshieldBase = 1.50
const cabTop = 2.22
const roofTop = truckRoof.top
const windshieldRake = -0.218
const sillX = bonnetHalfWidth + 0.008
const tailLightY = 0.725

export const flatbedBody = {
  finish: '#edae45',
  frame: { center: [0, 0.71, -0.05], size: [1.36, 0.30, 5.6] },
  bonnet: {
    halfWidth: bonnetHalfWidth,
    profile: [[0.24, 1.04], [2.8, 1.04], [noseZ, 1.1], [noseZ, 1.34], [2.78, beltline], [0.24, beltline]],
  },
  nose: { halfWidth: 0.7, profile: [[1.4, 0.74], [2.8, 0.74], [noseZ, 0.82], [noseZ, 1.06], [1.4, 1.06]] },
  // The cab skirt steps back behind the front wheel and the windshield rakes
  // from the bonnet up to the roof cap.
  cab: {
    halfWidth: cabHalfWidth,
    profile: [[cabRear, 0.74], [1.32, 0.74], [cabFront, beltline], [cabFront, windshieldBase], [1.63, cabTop], [cabRear, cabTop]],
  },
  roof: {
    halfWidth: 1.21,
    profile: [[0.23, 2.2], [1.66, 2.2], [1.78, 2.245], [1.7, roofTop], [cabRear, roofTop], [0.23, 2.27]],
  },
  windows: {
    rake: windshieldRake,
    front: { center: [0.52, 1.87, 1.73], size: [0.96, 0.6, 0.035] },
    wiper: { center: [0.5, 1.62, 1.785], size: [0.6, 0.035, 0.03], sweep: -0.13 },
    door: { centerX: cabHalfWidth + 0.003, halfWidth: 0.009, profile: [[0.42, 1.56], [1.7, 1.56], [1.58, 2.1], [0.42, 2.1]] },
    rear: { center: [0, 1.86, cabRear - 0.015], size: [1.3, 0.42, 0.04] },
  },
  door: {
    handle: { center: [cabHalfWidth + 0.01, 1.495, 0.55], size: [0.036, 0.05, 0.22] },
    coachline: { center: [sillX, 1.3, 1.5], size: [0.03, 0.06, 2.4] },
    // A Harbor Depot sun rising over the horizon, below the door glass.
    emblem: {
      centerX: sillX,
      halfWidth: 0.008,
      sun: [[0.65, 1.1], [0.95, 1.1], [0.945, 1.139], [0.93, 1.175], [0.906, 1.206], [0.875, 1.23], [0.839, 1.245], [0.8, 1.25], [0.761, 1.245], [0.725, 1.23], [0.694, 1.206], [0.67, 1.175], [0.655, 1.139]],
      horizon: { center: [sillX, 1.065, 0.8], size: [0.016, 0.035, 0.44] },
    },
  },
  mirror: {
    mount: { center: [1.24, 1.6, 1.7], size: [0.16, 0.05, 0.05] },
    housing: { center: [1.33, 1.72, 1.72], size: [0.11, 0.3, 0.16] },
    glass: { center: [1.33, 1.73, 1.635], size: [0.09, 0.22, 0.02] },
  },
  steps: {
    tread: { center: [1.17, 0.7, 0.78], size: [0.34, 0.08, 0.52] },
    bracket: { center: [1.12, 0.52, 0.76], size: [0.36, 0.07, 0.46] },
    // Hangers drop from the cab skirt to carry the lower step.
    hanger: { x: 1.0, z: [0.58, 0.94], y: 0.61, size: [0.05, 0.24, 0.05] },
  },
  roofMarker: { center: [0.7, roofTop + 0.02, 1.6], size: [0.13, 0.05, 0.1] },
  grille: {
    surround: { center: [0, 1.22, noseZ + 0.01], size: [1.1, 0.24, 0.04] },
    bar: { heights: [1.15, 1.22, 1.29], z: noseZ + 0.035, size: [0.96, 0.026, 0.026] },
  },
  headlightHousing: { center: [0.83, 1.215, noseZ + 0.01], size: [0.44, 0.23, 0.04] },
  indicator: { center: [1.1, 1.215, noseZ + 0.015], size: [0.1, 0.13, 0.05] },
  frontFender: { center: [1.22, 1.03, 1.92], size: [0.14, 0.07, 1.1] },
  frontBumper: { center: [0, 0.82, 2.93], size: [2.4, 0.18, 0.2] },
  rear: {
    crossmember: { center: [0, tailLightY, -2.92], size: [2.12, 0.18, 0.12] },
    bracket: { center: [0.62, 0.58, -2.95], size: [0.09, 0.28, 0.1] },
    bumper: { center: [0, 0.47, -2.98], size: [2.2, 0.13, 0.2] },
    lightHousing: { center: [0.84, tailLightY, -3.0], size: [0.56, 0.23, 0.1] },
    amberLens: { center: [0.64, tailLightY, -3.06], size: [0.1, 0.16, 0.03] },
  },
  // A flat mudguard over each rear wheel, with raked wings and a mud flap.
  rearFender: {
    top: { center: [1.22, 1.03, -1.89], size: [0.46, 0.08, 1.1] },
    frontWing: { center: [1.22, 0.93, -1.225], size: [0.44, 0.08, 0.3], rake: 0.7 },
    rearWing: { center: [1.22, 0.93, -2.555], size: [0.44, 0.08, 0.3], rake: -0.7 },
    mudFlap: { center: [1.2, 0.6, -2.72], size: [0.4, 0.54, 0.05] },
  },
  // Diesel on the right, a tool locker on the left, both tucked under the deck.
  fuelTank: { center: [0.86, 0.66, -0.55], diameter: 0.4, length: 0.95, segments: 12, straps: { z: [-0.85, -0.25], diameter: 0.42, width: 0.07 } },
  toolLocker: {
    body: { center: [-0.88, 0.66, -0.55], size: [0.36, 0.34, 0.8] },
    latch: { center: [-1.065, 0.7, -0.55], size: [0.02, 0.07, 0.12] },
  },
  // A cab guard keeps loose cargo off the rear window.
  cabGuard: {
    posts: { x: [-1.0, 1.0], center: [0, 1.53, 0.215], size: [0.08, 0.94, 0.05] },
    rails: { heights: [1.56, 1.96], center: [0, 0, 0.215], size: [2.12, 0.07, 0.06] },
  },
} as const

export const flatbedDeck = {
  thickness: 0.19,
  // The visible deck and railing sit below the cargo contact plane.
  renderInset: 0.06,
  finish: '#a97e54',
  seams: { x: [-0.68, -0.23, 0.23, 0.68], lift: 0.002, width: 0.025, height: 0.015, endInset: 0.045, finish: '#8b6746' },
  sideRails: {
    post: { depth: 0.12, extraWidth: 0.036, jointGap: 0.012 },
    lowerBoard: { rise: 0.21, height: 0.16 },
    upperBoard: { drop: 0.085, height: 0.17 },
    finish: '#b18c61',
  },
} as const

export const flatbedTireDepth = 0.4

export const flatbedLights = {
  head: {
    beam: { at: [0, 1.1, 2.98], direction: [0, -0.10, 1], angle: 0.9, exponent: 1.1, color: '#ffe9ad', range: 28 },
    lens: { x: 0.83, y: 1.215, z: noseZ + 0.035, size: [0.32, 0.15, 0.03], lit: '#fff3b0' },
  },
  tail: {
    beam: { at: [0, tailLightY, -3.12], direction: [0, -0.28, -1], angle: 1.5, exponent: 1.4, color: '#ff391f', range: 5 },
    lens: { x: 0.9, y: tailLightY, z: -3.06, size: [0.33, 0.17, 0.03], lit: '#c83832', braking: '#ff7763' },
    brakeIntensity: 2.2,
  },
} as const
