import { flatbedWheelLayout } from '../assets/geometry/flatbed.ts'
import type { GroundDrive } from './ground-drive.ts'

const suspensionMountHeight = 0.79
const suspensionRestLength = 0.38
const maxSuspensionTravel = 0.28
const suspensionStiffness = 40
const compressionDamping = 4.6
const relaxationDamping = 4.2
const tireFrictionSlip = 2.7
const suspensionRollInfluence = 0.21
const maxSuspensionForce = 16500

const engineForce = 3650
const forwardSpeedLimit = 13
const carefulSpeedLimit = 6.2
const reverseSpeedLimit = 5
const enginePowerFadeRange = 1.8

const reverseBrakeThreshold = 0.55
const maximumBrakeForce = 125
const baseBrakeForce = 20
const brakeForcePerSpeed = 50
const poweredDrag = 4
const idleDrag = 16

const lowSpeedSteeringAngle = 0.6
const steeringSpeedReduction = 0.34
const carefulSteeringAngle = 0.35
const steeringResponse = 9
const parkedClearance = 0.01
const shoreProbeDistance = 1.9

export const flatbedGroundDrive = {
  wheels: flatbedWheelLayout,
  suspension: {
    mountHeight: suspensionMountHeight,
    suspensionRestLength,
    maxSuspensionTravel,
    suspensionStiffness,
    dampingCompression: compressionDamping,
    dampingRelaxation: relaxationDamping,
    frictionSlip: tireFrictionSlip,
    rollInfluence: suspensionRollInfluence,
    maxSuspensionForce,
  },
  engine: {
    force: engineForce,
    forwardSpeed: forwardSpeedLimit,
    carefulSpeed: carefulSpeedLimit,
    reverseSpeed: reverseSpeedLimit,
    powerFadeRange: enginePowerFadeRange,
  },
  brakes: {
    reverseThreshold: reverseBrakeThreshold,
    maxForce: maximumBrakeForce,
    baseForce: baseBrakeForce,
    forcePerSpeed: brakeForcePerSpeed,
    poweredDrag,
    idleDrag,
  },
  steering: {
    lowSpeedAngle: lowSpeedSteeringAngle,
    speedReduction: steeringSpeedReduction,
    carefulAngle: carefulSteeringAngle,
    response: steeringResponse,
  },
  parkedClearance,
  shoreProbeDistance,
} as const satisfies GroundDrive
