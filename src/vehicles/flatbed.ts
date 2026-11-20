import type { GroundDrive } from './ground-drive.ts'

export const flatbedGroundDrive = {
  wheels: { radius: 0.48, halfTrack: 1.2, axles: [-1.89, 1.87] },
  suspension: {
    mountHeight: 0.79,
    suspensionRestLength: 0.38,
    maxSuspensionTravel: 0.28,
    suspensionStiffness: 40,
    dampingCompression: 4.6,
    dampingRelaxation: 4.2,
    frictionSlip: 2.7,
    rollInfluence: 0.21,
    maxSuspensionForce: 16500,
  },
  engine: {
    force: 3650,
    forwardSpeed: 13,
    carefulSpeed: 6.2,
    reverseSpeed: 5,
    powerFadeRange: 1.8,
  },
  brakes: {
    reverseThreshold: 0.55,
    maxForce: 125,
    baseForce: 20,
    forcePerSpeed: 50,
    poweredDrag: 4,
    idleDrag: 16,
  },
  steering: {
    lowSpeedAngle: 0.6,
    speedReduction: 0.34,
    carefulAngle: 0.35,
    response: 9,
  },
  parkedClearance: 0.01,
  shoreProbeDistance: 1.9,
} as const satisfies GroundDrive
