type ContactWindow = readonly [start: number, period: number, duration: number]

export const seedParachuteMotion = {
  release: [0.31, 0.91, 0.42] as const satisfies ContactWindow,
  source: { x: 0.08, y: 0.67, z: -0.04, sway: 0.23, frequency: 3.7 },
} as const

export const wetFernMotion = {
  brush: [0.4, 0.96, 0.56] as const satisfies ContactWindow,
  shake: { pitch: -0.61, pitchFrequency: 14, roll: 0.23, rollFrequency: 12, damping: 4 },
  releaseDuration: 0.19,
  floor: 0.035,
} as const

export const hoeMotion = {
  contact: [0.41, 0.89, 0.14] as const satisfies ContactWindow,
  swing: { start: 0.45, restingPitch: -0.34, reach: 0.52, toolRoll: -0.83 },
  minimumSourceY: 0.15,
} as const

export const harvestChaffMotion = {
  release: [0.38, 0.99, 0.28] as const satisfies ContactWindow,
  swayFrequency: 20,
  source: { x: -0.13, y: 0.94, z: 0.55, bob: 0.095, floor: 0.02 },
  bundle: { x: -0.18, y: 0.81, z: 0.55, bob: 0.09, roll: 0.71, rollSway: 0.29, rollFrequency: 14 },
} as const

export const takeoffFeatherMotion = {
  takeoff: { start: 0.32, duration: 2.8, x: -0.23, y: 0.43, z: 0.29, xSpeed: 1.56, zSpeed: 0.2, climb: 1.88, maxClimb: 2.15 },
  wings: { restingRoll: -0.75, flapRate: 19, flapReach: 0.73 },
  feathers: { start: 0.35, end: 0.55, x: -0.18, y: 0.65, z: 0.28, floor: 0.048 },
} as const

const carrotPullPeriod = 1.02
const carrotPullDuration = 0.53
export const carrotPullMotion = {
  pull: [0.43, carrotPullPeriod, carrotPullDuration] as const satisfies ContactWindow,
  release: [0.51, carrotPullPeriod, 0.15] as const satisfies ContactWindow,
  carrot: { restingY: 0.11, lift: 0.98, liftPower: 0.74, slide: 0.35, roll: -0.29, rollFrequency: 5 },
  arm: { restingPitch: 0.2, reachHeight: 0.44, reachGain: 2.18 },
  soil: { x: -0.3, spread: 0.37, minimumY: 0.135, belowCarrot: 0.16 },
} as const

export const hiveTrafficMotion = {
  lanes: 7,
  centreLane: 3,
  directionCycle: 5,
  inbound: { start: 0.86, spacing: 0.18, sequence: 4, heightRatio: 0.28, yawSway: 0.09, yawFrequency: 5, pitch: -0.21, speed: 1.43 },
  outbound: { pitch: 0.05 },
} as const

export const cloverStepMotion = {
  contact: [0.407, 0.56, 0.14] as const satisfies ContactWindow,
  walk: { x: -0.23, startZ: -1.27, stop: 3.05, speed: 0.74, heading: -0.15, strength: 0.47, stride: 1.12, phase: 0.25 },
  source: { x: -0.48, y: 0.245, ahead: 0.23, floor: 0.037 },
} as const

export const looseSlateMotion = {
  release: [0.33, 0.94, 0.23] as const satisfies ContactWindow,
  source: { x: -0.46, y: 0.57, z: 0.18, lanes: 4, spacing: 0.18, drift: 0.65, floor: 0.047 },
} as const

const shearPeriod = 0.71
const shearCloseDuration = 0.33
export const hedgeClippingMotion = {
  close: [0.43, shearPeriod, shearCloseDuration] as const satisfies ContactWindow,
  release: [0.41, shearPeriod, 0.14] as const satisfies ContactWindow,
  shears: { x: -0.47, y: 1.26, z: 0.78, sway: 0.22, swayFrequency: 3, minimumOpening: 0.095, openingRange: 0.38 },
  source: { z: 0.7, floor: 0.055 },
} as const
