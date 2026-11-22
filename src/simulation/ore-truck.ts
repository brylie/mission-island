import type { Pose } from '../world.ts'

export type HaulPose = Pose & { speed: number }
export interface HaulInput { throttle: number, steer: number, brake: boolean, dt: number }
// A collision cancels a predicted step and brings the truck to rest at its previous position.
export type HaulStep = HaulInput | null
export const maxHaulSteps = 32
const maxHaulStepSeconds = 0.065
const reverseSpeed = 5
const loadedSpeed = 15
const emptySpeed = 19
const brakeDeceleration = 18
const coastDeceleration = 4
const reversalDeceleration = 12
const loadedAcceleration = 3.6
const emptyAcceleration = 5
const minimumTurnRadius = 6.1
const turnRadiusPerSpeed = 0.24
const wheelbase = 5.77

export function isHaulStep(value: unknown): value is HaulStep {
  if (value === null) return true
  if (!value || typeof value !== 'object') return false
  const step = value as Partial<HaulInput>
  const axis = (n: unknown) => n === -1 || n === 0 || n === 1
  return axis(step.throttle) && axis(step.steer) && typeof step.brake === 'boolean'
    && typeof step.dt === 'number' && step.dt > 0 && step.dt <= maxHaulStepSeconds
}

export function advanceHauler(pose: HaulPose, step: HaulStep, loaded: boolean) {
  if (!step) {
    pose.speed = 0
    return 0
  }
  const { throttle, steer, brake, dt } = step
  const desired = brake ? 0 : throttle * (throttle < 0 ? reverseSpeed : loaded ? loadedSpeed : emptySpeed)
  const rate = brake ? brakeDeceleration : !throttle ? coastDeceleration : throttle * pose.speed < 0 ? reversalDeceleration : loaded ? loadedAcceleration : emptyAcceleration
  pose.speed += Math.sign(desired - pose.speed) * Math.min(Math.abs(desired - pose.speed), dt * rate)
  const travel = pose.speed * dt
  const radius = minimumTurnRadius + turnRadiusPerSpeed * Math.abs(pose.speed)
  pose.heading += steer * travel / radius
  pose.x += Math.sin(pose.heading) * travel
  pose.z += Math.cos(pose.heading) * travel
  return steer * Math.atan(wheelbase / radius)
}
