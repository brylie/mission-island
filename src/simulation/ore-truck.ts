import type { Pose } from '../world.ts'

export type HaulPose = Pose & { speed: number }
export interface HaulInput { throttle: number, steer: number, brake: boolean, dt: number }
// A collision cancels a predicted step and brings the truck to rest at its previous position.
export type HaulStep = HaulInput | null
export const maxHaulSteps = 32

export function isHaulStep(value: unknown): value is HaulStep {
  if (value === null) return true
  if (!value || typeof value !== 'object') return false
  const step = value as Partial<HaulInput>
  const axis = (n: unknown) => n === -1 || n === 0 || n === 1
  return axis(step.throttle) && axis(step.steer) && typeof step.brake === 'boolean'
    && typeof step.dt === 'number' && step.dt > 0 && step.dt <= 0.065
}

export function advanceHauler(pose: HaulPose, step: HaulStep, loaded: boolean) {
  if (!step) {
    pose.speed = 0
    return 0
  }
  const { throttle, steer, brake, dt } = step
  const desired = brake ? 0 : throttle * (throttle < 0 ? 5 : loaded ? 15 : 19)
  const rate = brake ? 18 : !throttle ? 4 : throttle * pose.speed < 0 ? 12 : loaded ? 3.6 : 5
  pose.speed += Math.sign(desired - pose.speed) * Math.min(Math.abs(desired - pose.speed), dt * rate)
  const travel = pose.speed * dt
  const radius = 6.1 + 0.24 * Math.abs(pose.speed)
  pose.heading += steer * travel / radius
  pose.x += Math.sin(pose.heading) * travel
  pose.z += Math.cos(pose.heading) * travel
  return steer * Math.atan(5.77 / radius)
}
