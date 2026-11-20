export interface GroundDrive {
  wheels: {
    radius: number
    halfTrack: number
    // Wheel and suspension order is left rear, left front, right rear, right front.
    axles: readonly [rear: number, front: number]
  }
  suspension: {
    mountHeight: number
    suspensionRestLength: number
    maxSuspensionTravel: number
    suspensionStiffness: number
    dampingCompression: number
    dampingRelaxation: number
    frictionSlip: number
    rollInfluence: number
    maxSuspensionForce: number
  }
  engine: {
    force: number
    forwardSpeed: number
    carefulSpeed: number
    reverseSpeed: number
    powerFadeRange: number
  }
  brakes: {
    reverseThreshold: number
    maxForce: number
    baseForce: number
    forcePerSpeed: number
    poweredDrag: number
    idleDrag: number
  }
  steering: {
    lowSpeedAngle: number
    speedReduction: number
    carefulAngle: number
    response: number
  }
  parkedClearance: number
  shoreProbeDistance: number
}
