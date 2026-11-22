export const brinewickMarketReview = {
  duration: 10,
  angle: 1.94,
  ground: { height: 8.58, color: '#9f9c81' },
  weather: { setupHour: 8.5, closingSecondsPerHour: 20, rain: 0.85 },
} as const

export const longAcreReview = {
  duration: 32,
  angle: 0.32,
  ground: { height: 17, color: '#7e975f' },
  hour: 10.5,
  rain: 0.82,
  day: [0, 0, 6, 1],
} as const

export const lookoutReview = {
  duration: 10,
  angle: -0.58,
  hour: 13,
  steamFootprint: 0.88,
  establishedDawns: 3,
  incidentFire: 0.77,
} as const

export const residentRehearsal = {
  duration: 6,
  hour: [10, 0, 23.75, 0.25],
  trust: { 0: 'Stranger', 1: 'Familiar', 3: 'Trusted' },
  remarkMaxSeed: 999,
  avatarId: 4,
  walkCycleRate: 1.8,
  walkStride: 0.65,
} as const

export const landscapeFurnishingControls = {
  offset: [-6, 6, 0.1],
  heading: [-180, 180, 1],
  scale: [0.25, 3, 0.01],
  stageAngleOffset: 1.1,
  location: { height: 0.65, camera: { alpha: -0.95, beta: 1.18, radius: 8 } },
} as const
