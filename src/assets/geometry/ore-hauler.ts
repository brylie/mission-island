const steeringAxle = 2.8

export const haulerSpec = {
  name: 'Ore truck',
  width: 2.55,
  length: 8.8,
  height: 3.4,
  track: 2.04,
  axles: [-2.97, -1.72, steeringAxle],
  wheel: 0.54,
  cargo: { width: 2.17, length: 5.28, height: 1.36, floor: 1.25, z: -1.29 },
} as const

// The walking volume covers the body below the forward cab roof.
export const oreHaulerWalkingVolume = { bottom: 0.25, top: 2.65, width: haulerSpec.width, depth: haulerSpec.length } as const

export type HaulerBox = {
  center: readonly [x: number, y: number, z: number]
  size: readonly [width: number, height: number, depth: number]
}

export type HaulerProfile = readonly (readonly [z: number, y: number])[]

export interface HaulerWheelRing {
  offset: number
  outerDiameter: number
  innerDiameter: number
  depth: number
}

export const oreHaulerCab = {
  sill: {
    halfWidth: 1.15,
    profile: [[1.58, 1.10], [4.07, 1.10], [4.24, 1.24], [4.24, 1.57], [3.94, 1.86], [1.58, 1.86]],
  },
  envelope: { halfWidth: 1.09, profile: [[1.64, 1.83], [3.94, 1.83], [3.65, 2.96], [1.77, 2.96]] },
  roof: {
    halfWidth: 1.16,
    profile: [[1.66, 2.93], [3.72, 2.93], [3.81, 2.99], [3.62, 3.09], [1.79, 3.09], [1.66, 3.03]],
  },
  windows: {
    front: { center: [0.505, 2.46, 3.79], size: [0.96, 0.86, 0.035] },
    frontRake: -0.25,
    wiper: { center: [0.51, 2.16, 3.89], size: [0.65, 0.037, 0.035], sweep: -0.13 },
    door: { centerX: 1.094, halfWidth: 0.009, profile: [[1.84, 2.05], [3.68, 2.05], [3.48, 2.86], [1.93, 2.86]] },
    divider: { center: [1.11, 2.48, 2.34], size: [0.026, 0.80, 0.055] },
    rear: { center: [0, 2.49, 1.69], size: [1.29, 0.40, 0.046], rake: 0.115 },
  },
  door: {
    handle: { center: [1.154, 1.70, 1.93], size: [0.036, 0.065, 0.24] },
    trim: { center: [1.155, 1.39, 2.42], size: [0.034, 0.065, 1.4] },
    emblem: {
      centerX: 1.158,
      halfWidth: 0.008,
      peak: [[2.69, 1.51], [3.09, 1.51], [2.90, 1.73]],
      ridge: [[3.04, 1.51], [3.29, 1.51], [3.17, 1.65]],
    },
  },
  mirror: {
    mount: { center: [1.15, 2.04, 3.52], size: [0.18, 0.065, 0.065] },
    housing: { center: [1.20, 2.21, 3.54], size: [0.13, 0.35, 0.18] },
    glass: { center: [1.20, 2.22, 3.44], size: [0.103, 0.26, 0.019] },
  },
  steps: {
    top: { center: [1.07, 0.84, 1.78], size: [0.32, 0.13, 0.53] },
    bottom: { center: [1.02, 0.63, 1.71], size: [0.40, 0.11, 0.48] },
  },
  lights: {
    headlightHousing: { center: [0.86, 1.39, 4.25], size: [0.45, 0.24, 0.08] },
    headlightLens: { center: [0.86, 1.40, 4.297], size: [0.32, 0.15, 0.027] },
    indicator: { center: [1.08, 1.39, 4.25], size: [0.09, 0.14, 0.055] },
    roofMarker: { center: [0.73, 3.108, 3.39], size: [0.14, 0.06, 0.12] },
  },
  grille: {
    surround: { center: [0, 1.43, 4.25], size: [1.12, 0.33, 0.055] },
    bar: { heights: [1.34, 1.43, 1.52], z: 4.29, size: [0.98, 0.024, 0.026] },
  },
  bumper: { center: [0, 0.92, 4.22], size: [2.41, 0.26, 0.32] },
} as const

const { width, length, floor, height, z } = haulerSpec.cargo
const rear = z - length / 2
const front = z + length / 2
const lip = floor + height

export const oreHaulerTipper = {
  liner: { center: [0, floor - 0.075, z + 0.09], size: [width - 0.17, 0.15, length - 0.26] },
  side: {
    centerX: width / 2 - 0.10,
    halfWidth: 0.075,
    flare: 0.13,
    profile: [[rear + 0.28, floor - 0.07], [front - 0.13, floor - 0.07], [front, lip], [rear, lip]],
    rib: {
      centers: [-3.30, -2.15, -1.00, 0.15, 1.00],
      outboard: 0.085,
      halfWidth: 0.027,
      profile: [[0.11, floor + 0.06], [0.24, floor + 0.06], [0.04, lip - 0.06], [-0.12, lip - 0.06]],
    },
    lipRail: { center: [1.16, lip, z], size: [0.17, 0.115, length + 0.05] },
    sill: { center: [0.99, floor - 0.01, z + 0.08], size: [0.18, 0.14, length - 0.29] },
    linerRunner: { center: [0.67, floor + 0.01, z + 0.08], size: [0.075, 0.034, length - 0.44] },
  },
  tailgate: {
    rake: -0.17,
    plate: { center: [0, floor + height / 2, rear + 0.155], size: [width - 0.10, height, 0.12] },
    cap: { center: [0, lip, rear - 0.012], size: [width - 0.02, 0.12, 0.14] },
    stiffener: { center: [0.80, 1.91, rear + 0.122], size: [0.105, 1.10, 0.10] },
    hinge: { center: [0.81, lip + 0.015, rear - 0.07], size: [0.34, 0.15, 0.17] },
    latch: { center: [0.88, 1.32, rear + 0.16], size: [0.18, 0.27, 0.16] },
    chevron: { center: [0.19, 1.97, rear + 0.053], size: [0.48, 0.085, 0.025], slant: 0.40 },
    crossbar: { center: [0, 1.52, rear + 0.14], size: [1.98, 0.11, 0.10] },
  },
  headboard: { center: [0, 2.25, front - 0.025], size: [2.19, 1.99, 0.13] },
  canopy: { halfWidth: 1.22, profile: [[front - 0.10, 3.23], [2.22, 3.23], [2.30, 3.33], [front - 0.09, 3.37]] },
  gusset: { centerX: 1.10, halfWidth: 0.05, profile: [[front + 0.03, 2.70], [2.11, 3.23], [front + 0.03, 3.23]] },
} as const

const fenderX = 1.02
const tandemWingWidth = 0.44
const tandemWingThickness = 0.105
const tandemWingDrop = 0.70

export const oreHaulerChassis = {
  frame: { center: [0, 0.78, 0.04], size: [1.43, 0.32, 8.33] },
  fuelTank: {
    center: [0.85, 0.81, 0.20],
    diameter: 0.51,
    length: 1.24,
    segments: 12,
    straps: { positionsZ: [-0.18, 0.58], diameter: 0.53, width: 0.095 },
  },
  fender: {
    tandem: { center: [fenderX, 1.17, -2.345], size: [tandemWingWidth, tandemWingThickness, 2.03] },
    rearWing: { center: [fenderX, 1.045, -3.46], size: [tandemWingWidth, tandemWingThickness, 0.35], rake: -tandemWingDrop },
    frontWing: { center: [fenderX, 1.045, -1.23], size: [tandemWingWidth, tandemWingThickness, 0.35], rake: tandemWingDrop },
    mudFlap: { center: [fenderX, 0.69, -3.58], size: [0.40, 0.57, 0.06] },
    front: { center: [fenderX, 1.135, steeringAxle], size: [0.43, 0.10, 1.08] },
  },
  tailLights: {
    housing: { center: [0.89, 0.78, -4.16], size: [0.45, 0.20, 0.12] },
    redLens: { center: [0.92, 0.79, -4.23], size: [0.24, 0.105, 0.035] },
    amberLens: { center: [0.73, 0.79, -4.23], size: [0.10, 0.105, 0.035] },
  },
  rearCrossmember: { center: [0, 0.77, -4.14], size: [2.19, 0.18, 0.14] },
  rearBracket: { center: [0.64, 0.64, -4.16], size: [0.095, 0.31, 0.12] },
  rearBumper: { center: [0, 0.51, -4.19], size: [2.18, 0.14, 0.22] },
} as const

const tireDiameter = haulerSpec.wheel * 2

export const oreHaulerWheel = {
  steeringAxle,
  halfTrack: haulerSpec.track / 2,
  segments: 16,
  tire: { offset: 0, outerDiameter: tireDiameter, innerDiameter: tireDiameter, depth: 0.33 },
  shoulder: { offset: 0.185, outerDiameter: 0.95, innerDiameter: tireDiameter, depth: 0.055 },
  rim: { offset: 0.215, outerDiameter: 0.61, innerDiameter: 0.67, depth: 0.035 },
  hub: { offset: 0.236, outerDiameter: 0.46, innerDiameter: 0.51, depth: 0.03 },
  cap: { offset: 0.253, outerDiameter: 0.22, innerDiameter: 0.29, depth: 0.036 },
  lug: { offset: 0.256, boltCircleRadius: 0.173, count: 6, size: [0.028, 0.053, 0.056] },
} as const
