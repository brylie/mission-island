export const crewToolGrip = { offsetX: 0.12, y: -0.53, z: 0.017 } as const

export const crewSkiffSeats = [[-0.44, -0.39, 0.25], [0.44, -0.39, 0.25]] as const

export const crewHoe = {
  tilt: -0.8,
  shaft: { centre: [0, -0.36, 0], diameter: 0.068, length: 1.29, sides: 9, color: '#ab784d' },
  blade: { centre: [0, -0.99, 0.08], size: [0.21, 0.082, 0.34], color: '#58716e' },
  soilContact: [0, -1, 0.09],
} as const

export const crewWateringCan = {
  body: { centre: [0, -0.16, 0.15], size: [0.33, 0.42, 0.32], color: '#608f87' },
  spout: { centre: [0, -0.16, 0.35], size: [0.073, 0.09, 0.25], tilt: -0.35, color: '#6a9990' },
  rose: { centre: [0, -0.13, 0.48], size: [0.117, 0.11, 0.09], color: '#d0ae72' },
  sprayOrigin: [0, -0.13, 0.54],
} as const

export const crewPaddle = {
  shaft: { centre: [0, 0.12, 0], diameter: 0.052, length: 1.98, sides: 8, color: '#8f6746' },
  blade: { centre: [0, -0.96, 0], size: [0.25, 0.4, 0.068], color: '#c29862' },
  waterContact: [0, -1.09, 0],
} as const

export const crewFishingRod = {
  shaft: { centre: [0, -0.6, 0], topDiameter: 0.04, bottomDiameter: 0.013, length: 1.65, sides: 8, color: '#496552' },
  reel: { centre: [0, -0.12, 0.06], size: [0.13, 0.12, 0.09], color: '#cbd4bd' },
} as const
