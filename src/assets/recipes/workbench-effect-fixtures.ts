type ContactWindow = readonly [start: number, period: number, duration: number]

export const waterfallSource = { studioY: 0.08 } as const

export const shoreSource = { x: 0, y: 0.05, z: 0, floor: 0.012 } as const

export const paddleMotion = {
  stroke: { start: 0.34, period: 0.85, pitchReach: 0.45, roll: 1.02, rollReach: 0.24 },
  contact: { maximumY: 0.19, minimumY: -0.15, sourceY: 0.026, floor: 0.012 },
} as const

export const rainSource = { x: -0.6, y: 4.35, z: -0.45, floor: 0.09 } as const

export const mistSource = { x: -0.75, y: 0.19, z: 0, floor: 0.025 } as const

export const leavesSource = { x: -0.55, y: 1.69, z: -0.25, floor: 0.035 } as const

export const tireDustMotion = {
  contact: { outsideTire: 0.08, y: 0.055, behindAxle: 0.12, floorOffset: 0.056 },
  wheelRate: 10,
} as const

export const puddleSources = {
  splash: { x: 0, y: 0.034, z: 0 },
  rain: { x: -0.21, y: 2.65, z: 0, floor: 0.03 },
} as const

export const sunbeamMotion = { x: -0.3, xSpeed: 0.135, y: 1.23, bob: 0.27, bobFrequency: 2.3, z: 0.01 } as const

export const sandMotion = {
  gust: [0.26, 1.12, 0.52] as const satisfies ContactWindow,
  source: { x: -2.08, y: 0.026, driftLanes: [-0.65, 0.4], speed: 0.88, speedStep: 0.08, speedSequence: 4 },
  hazeY: 0.104,
} as const

export const breathMotion = {
  exhale: [0.37, 0.97, 0.224] as const satisfies ContactWindow,
  heading: { rest: -0.3, frequency: 1.75, sweep: 0.49 },
  mouth: { forward: 0.302, height: 1.38 },
} as const

export const mothMotion = {
  orbit: { heightAboveStand: 0.26, approachRate: 4.9, angleStep: 1.38, radius: 0.29, radiusCycle: 5, radiusStep: 0.107, turnCycle: 3, turnRate: 3.8, counterTurnRate: -2.15, peelAfter: 1.45 },
  flame: { heightScale: 0.13, variation: 0.022, frequency: 12 },
} as const

export const ventMotion = { puff: [0.25, 1.1, 0.74] as const satisfies ContactWindow } as const

export const gateFrostMotion = {
  release: [0.4, 1.05, 0.16] as const satisfies ContactWindow,
  contacts: 7,
  swing: { angle: 0.61, duration: 3 },
  floor: 0.015,
} as const

export const canvasRunoffMotion = {
  surge: [0.28, 0.67, 0.24] as const satisfies ContactWindow,
  stagger: 0.035,
  staggerCycle: 4,
  ripplesStart: 0.68,
} as const

const snuffTime = 0.52
export const snuffMotion = {
  extinguish: snuffTime,
  smokeEnd: 1.13,
  source: { x: 0, y: 1.34, z: 0 },
  unlitGlobeVisibility: 0.2,
} as const

const wateringSweepRate = 2.65
export const wateringMotion = {
  armReach: 0.43,
  can: { pitch: 0.44, pitchRate: 3, pitchReach: 0.16, yawRate: wateringSweepRate, yawReach: 0.24 },
  splash: { start: 0.61, phase: 0.3, rate: wateringSweepRate, x: 0.09, spread: 0.33, y: 0.109, z: 1.03 },
} as const

export const sawdustMotion = {
  cut: [0.3, 1.03, 0.56] as const satisfies ContactWindow,
  floor: 0.035,
} as const

export const crateGritMotion = {
  landings: [{ time: 0.47, speed: 0.59 }, { time: 1.52, speed: 1 }, { time: 2.59, speed: 1.23 }],
  contact: { duration: 0.13, xOffset: 0.43, y: 0.044, zOffset: 0.41, floor: 0.024, directions: 4 },
  drop: { clearance: 0.022, height: 0.67, approachSpeed: 1.15, reboundDuration: 0.19, reboundHeight: 0.079 },
} as const

export const ashMotion = {
  embers: { end: 0.6, floor: 0.08 },
  steam: { start: 0.59, xRate: 3.5, xReach: 0.39, zRate: 2.1, zReach: 0.2, speed: 1.12, fadeDuration: 3, fadeRate: 0.17 },
} as const

export const ferrySparksMotion = {
  weld: [0.33, 0.69, 0.21] as const satisfies ContactWindow,
  source: { x: -0.078, y: 0.66, z: -0.323, downwardSpeed: 0.25, floor: 0.012 },
} as const
