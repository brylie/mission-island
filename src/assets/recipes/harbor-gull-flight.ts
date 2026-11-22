type ControlPoint = readonly [x: number, y: number, z: number]
type FlightLeg = {
  end: number
  phase: 'Push-off' | 'Climb' | 'Glide' | 'Approach' | 'Flare'
  controlPoints: readonly [ControlPoint, ControlPoint, ControlPoint, ControlPoint]
}

const climbEnd = 0.295
const flareStart = 0.925

// The circuit is in perch-local meters, with each leg ending at a normalized flight time.
export const harborGullCircuit = [
  {
    end: 0.105,
    phase: 'Push-off',
    controlPoints: [[0, 0, 0], [0, 0.03, 1.23], [0.47, 1.65, 4.71], [2.4, 3.35, 7.6]],
  },
  {
    end: climbEnd,
    phase: 'Climb',
    controlPoints: [[2.4, 3.35, 7.6], [5.87, 6.41, 12.80], [14, 7.3, 13], [20, 7.1, 8]],
  },
  {
    end: 0.675,
    phase: 'Glide',
    controlPoints: [[20, 7.1, 8], [27, 6.87, 2.17], [22, 6.1, -12], [13, 5.25, -14]],
  },
  {
    end: flareStart,
    phase: 'Approach',
    controlPoints: [[13, 5.25, -14], [4, 4.4, -16], [0, 1.70, -9], [0, 0.66, -3.4]],
  },
  {
    end: 1,
    phase: 'Flare',
    controlPoints: [[0, 0.66, -3.4], [0, 0.46, -2.34], [0, 0.012, -0.74], [0, 0, 0]],
  },
] as const satisfies readonly FlightLeg[]

export const harborGullFlightStyle = {
  pathEasing: { pushOffPower: 1.2, flarePower: 1.3 },
  bank: { tangentLookAhead: 0.025, gain: 4.2, limitRad: 0.27, levelFrom: 0.87 },
  pitch: { minRad: -0.27, maxRad: 0.18 },
  flare: { pitchRad: 0.24, riseFrom: flareStart, riseTo: 0.972, levelFrom: 0.975 },
  wingbeat: {
    climbFadeFrom: 0.21,
    climbFadeTo: climbEnd,
    glideWeight: 0.09,
    climbWeight: 0.91,
    speedRadPerSecond: 11.2,
    amplitudeRad: 0.55,
    engageTo: 0.013,
  },
  tuck: { raiseFrom: 0.006, raiseTo: 0.085, lowerFrom: 0.87, lowerTo: 0.97 },
  sweep: { glideRad: 0.13, landingRad: 0.18, landingFrom: 0.91, landingTo: 0.98 },
  separation: { metersPerBird: 0.48, riseFrom: 0.035, riseTo: 0.24, fallFrom: 0.70, fallTo: 0.96 },
} as const
