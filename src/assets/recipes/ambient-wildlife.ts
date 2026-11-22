export const birdActivityStyle = {
  daylight: { rise: [5.4, 6.7], fall: [17.2, 19.2] },
  birdRainShelter: { ramp: [0.55, 0.96], maximum: 0.9 },
  landing: { periodS: 48, settle: [0.64, 0.79], takeoff: [0.90, 0.99] },
  batActivity: { daylight: [0.03, 0.77], rain: [0.25, 0.83] },
} as const

export const ambientSchoolStyle = {
  count: 6,
  color: '#8ac0ad',
  size: { smallest: 0.79, groups: 4, step: 0.11 },
  formation: {
    across: 3,
    lateralSpacingM: 0.62,
    rowCenter: 0.55,
    rowSpacingM: 0.86,
    vShape: 0.27,
    depthM: 0.18,
    shoreInset: 0.16,
    scatterGain: 0.2,
  },
  swim: { calmRadPerSecond: 3.3, startledRadPerSecond: 6, fishPhaseRad: 1.5, swayM: 0.09, liftM: 0.035, yawRad: 0.105, rollRad: 0.055 },
} as const

export const ambientFlockStyle = {
  bird: { orbitRadPerSecond: 0.22, heightM: 1.2, flapRadPerSecond: 5.6 },
  bat: { orbitRadPerSecond: 0.92, heightM: 2, flapRadPerSecond: 15 },
  orbit: {
    phaseStepRad: 0.17,
    orbitLanes: 3,
    laneSpacingM: 1.4,
    depthRatio: 0.63,
    climbCyclesPerTurn: 2.0,
    heightPerMemberM: 0.18,
  },
  resting: { lateralSpacingM: 0.66, heightOffsetM: 0.035, depthSpacingM: 0.55, yawRad: 0.67, yawPerMemberRad: 0.82 },
  wings: { flapRad: 0.52, phaseStepRad: 0.72, foldedPitchRad: 1.18, foldedSweepRad: 0.8 },
} as const
