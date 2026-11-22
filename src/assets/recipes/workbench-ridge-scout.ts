export const ridgeScoutViews = {
  studio: { radius: 5.4, angle: -0.9, hour: 13 },
  overview: { focusZ: 66, fogStart: 330, fogEnd: 490, beta: 0.53, radius: 235 },
  follow: { lookAhead: 1.35, aimHeight: 1, alphaHalfTurns: 1.5, beta: 0.88, returnBeta: 1.13, radius: 6.3, launchHeadingOffset: 0.13 },
  zoom: { minimum: 3.4, maximum: 260 },
} as const

export const ridgeScoutMotion = {
  returnWaypoint: { arrivalRadius: 2, launchDistance: 14 },
  launchRadius: 1.2,
  walk: { cycleMetres: 4.8, strideLimit: 0.75, strideGain: 0.08 },
  pose: { blendRate: 15, groundLift: 0.035, rackedWingY: -0.58 },
} as const
