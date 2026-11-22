export const castTrial = {
  duration: 27,
  power: { min: 0, max: 100, step: 1, value: 75 },
  extent: { position: [0, 0.1, -6.2], size: [0.2, 0.2, 12.4] },
  float: { restY: 0.09, flightY: 1.2, arcY: 1.25, reelTravel: 0.88 },
} as const

export const cargoTrial = {
  duration: 3,
  power: { min: 0, max: 100, step: 5, value: 55 },
  start: { truckOffsetX: 5.5, crateY: 1.35 },
} as const
