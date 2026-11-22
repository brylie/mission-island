import { compactTractorSpec } from '../assets/geometry/compact-tractor.ts'
import { responsePickupSpec } from '../assets/geometry/response-pickup.ts'
import type { GroundDrive } from './ground-drive.ts'

// The pickup is lighter and quicker than the flatbed and steers a little
// tighter, so a new driver feels the difference between them.
const pickupMountHeight = 0.7
const pickupRestLength = 0.34
const pickupTravel = 0.24
const pickupStiffness = 38
const pickupCompressionDamping = 4.4
const pickupRelaxationDamping = 4
const pickupFrictionSlip = 2.8
const pickupRollInfluence = 0.2
const pickupMaxSuspensionForce = 12000
const pickupEngineForce = 2900
const pickupForwardSpeed = 14
const pickupCarefulSpeed = 6.5
const pickupReverseSpeed = 5
const pickupPowerFade = 1.8
const pickupMaxBrake = 110
const pickupLowSpeedSteering = 0.62
const pickupSteeringReduction = 0.34
const pickupCarefulSteering = 0.36

// The tractor is slow and turns sharply; full speed is little more than a jog.
const tractorMountHeight = 0.86
const tractorRestLength = 0.32
const tractorTravel = 0.18
const tractorStiffness = 52
const tractorCompressionDamping = 5
const tractorRelaxationDamping = 4.6
const tractorFrictionSlip = 3.2
const tractorRollInfluence = 0.16
const tractorMaxSuspensionForce = 14000
const tractorEngineForce = 2500
const tractorForwardSpeed = 6.5
const tractorCarefulSpeed = 3.4
const tractorReverseSpeed = 3
const tractorPowerFade = 1.2
const tractorMaxBrake = 120
const tractorLowSpeedSteering = 0.72
const tractorSteeringReduction = 0.18
const tractorCarefulSteering = 0.5

const reverseBrakeThreshold = 0.55
const baseBrakeForce = 20
const brakeForcePerSpeed = 50
const poweredDrag = 4
const idleDrag = 16
const steeringResponse = 9
const parkedClearance = 0.01
const pickupShoreProbe = 1.7
const tractorShoreProbe = 1.2

const brakes = (maxForce: number) => ({ reverseThreshold: reverseBrakeThreshold, maxForce, baseForce: baseBrakeForce, forcePerSpeed: brakeForcePerSpeed, poweredDrag, idleDrag })

export const responsePickupDrive = {
  wheels: { radius: responsePickupSpec.wheelRadius, halfTrack: responsePickupSpec.halfTrack, axles: responsePickupSpec.axles },
  suspension: {
    mountHeight: pickupMountHeight,
    suspensionRestLength: pickupRestLength,
    maxSuspensionTravel: pickupTravel,
    suspensionStiffness: pickupStiffness,
    dampingCompression: pickupCompressionDamping,
    dampingRelaxation: pickupRelaxationDamping,
    frictionSlip: pickupFrictionSlip,
    rollInfluence: pickupRollInfluence,
    maxSuspensionForce: pickupMaxSuspensionForce,
  },
  engine: { force: pickupEngineForce, forwardSpeed: pickupForwardSpeed, carefulSpeed: pickupCarefulSpeed, reverseSpeed: pickupReverseSpeed, powerFadeRange: pickupPowerFade },
  brakes: brakes(pickupMaxBrake),
  steering: { lowSpeedAngle: pickupLowSpeedSteering, speedReduction: pickupSteeringReduction, carefulAngle: pickupCarefulSteering, response: steeringResponse },
  parkedClearance,
  shoreProbeDistance: pickupShoreProbe,
} as const satisfies GroundDrive

export const compactTractorDrive = {
  wheels: { radius: compactTractorSpec.wheelRadius, halfTrack: compactTractorSpec.halfTrack, axles: compactTractorSpec.axles },
  suspension: {
    mountHeight: tractorMountHeight,
    suspensionRestLength: tractorRestLength,
    maxSuspensionTravel: tractorTravel,
    suspensionStiffness: tractorStiffness,
    dampingCompression: tractorCompressionDamping,
    dampingRelaxation: tractorRelaxationDamping,
    frictionSlip: tractorFrictionSlip,
    rollInfluence: tractorRollInfluence,
    maxSuspensionForce: tractorMaxSuspensionForce,
  },
  engine: { force: tractorEngineForce, forwardSpeed: tractorForwardSpeed, carefulSpeed: tractorCarefulSpeed, reverseSpeed: tractorReverseSpeed, powerFadeRange: tractorPowerFade },
  brakes: brakes(tractorMaxBrake),
  steering: { lowSpeedAngle: tractorLowSpeedSteering, speedReduction: tractorSteeringReduction, carefulAngle: tractorCarefulSteering, response: steeringResponse },
  parkedClearance,
  shoreProbeDistance: tractorShoreProbe,
} as const satisfies GroundDrive
