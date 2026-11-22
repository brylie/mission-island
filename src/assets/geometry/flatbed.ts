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

export const flatbedBody = {
  chassis: { y: 0.68, sideInset: 0.16, height: 0.53, length: chassisLength, finish: '#374848' },
  hood: { center: [0, 1.09, 1.55], size: [hoodWidth, 0.68, 2.63], finish: '#f5bc54' },
  cab: { center: [0, upperCab.y, upperCab.z], size: [upperCab.width, upperCab.height, upperCab.length], finish: '#edae45' },
  windshield: { center: [0, 1.9, 1.8], size: [1.96, 0.62, 0.07], finish: '#426976' },
  sideWindow: { x: 1.19, y: 1.91, z: 1.02, size: [0.07, 0.6, 1.18], finish: '#557b83' },
  mirror: { x: 1.33, y: 1.6, z: 1.58, size: [0.26, 0.27, 0.3], finish: '#435853' },
  bumpers: [
    { center: [0, 0.61, 2.87], size: [2.51, 0.27, 0.2] },
    { center: [0, 0.56, -2.94], size: [2.52, 0.24, 0.2] },
  ],
} as const

export const flatbedDeck = {
  thickness: 0.19,
  // The visible deck and railing sit below the cargo contact plane.
  renderInset: 0.06,
  finish: '#a97e54',
  seams: { x: [-0.68, -0.23, 0.23, 0.68], lift: 0.002, width: 0.025, height: 0.015, endInset: 0.045, finish: '#8b6746' },
  sideRails: {
    post: { depth: 0.12, extraWidth: 0.036, jointGap: 0.012, finish: '#415653' },
    lowerBoard: { rise: 0.21, height: 0.16 },
    upperBoard: { drop: 0.085, height: 0.17 },
    finish: '#b18c61',
  },
} as const

export const flatbedWheelTrim = {
  tire: { thickness: 0.46, segments: 14, finish: '#253834' },
  hub: { x: 0.24, diameter: 0.42, thickness: 0.04, segments: 10, finish: '#9aab9d' },
} as const

const tailLightY = 0.57
export const flatbedLights = {
  head: {
    beam: { at: [0, 1.1, 2.98], direction: [0, -0.10, 1], angle: 0.9, exponent: 1.1, color: '#ffe9ad', range: 28 },
    lens: { x: 0.86, y: 1.08, z: 2.9, size: [0.47, 0.25, 0.09], unlit: '#fff4c1', lit: '#fff3b0' },
  },
  tail: {
    beam: { at: [0, tailLightY, -3.12], direction: [0, -0.28, -1], angle: 1.5, exponent: 1.4, color: '#ff391f', range: 5 },
    lens: { x: 0.89, y: tailLightY, z: -3.065, size: [0.33, 0.17, 0.042], unlit: '#be5848', lit: '#c83832', braking: '#ff7763' },
    brakeIntensity: 2.2,
  },
} as const
