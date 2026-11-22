import type { Input, Player, Skiff } from '../src/protocol'
import { waterDepth, waterLevel, withinSkiffBoundary } from '../src/terrain.ts'
import { dockEndZ, harborDock, offset, skiffStart } from '../src/world.ts'
import type { Point, Pose } from '../src/world'
import { canWalkAt } from '../src/simulation/movement.ts'

const half = 0.5
const halfDockWidthM = harborDock.width * half
const dockSideClearanceM = 0.275
const dockEndClearanceM = 0.67
const dockStartClearanceM = 0.5
const minimumNavigableDepthM = 0.24
const hullBowProbeM = 1.85
const hullSternProbeM = -1.62
const hullPortProbeM = -0.62
const hullStarboardProbeM = 0.62
const maximumReverseSpeedMps = -2.5
const maximumForwardSpeedMps = 5.4
const paddleSpeedMps = 3.45
const coastDecelerationMps2 = 2.5
const paddleAccelerationMps2 = 2.3
const turnRateRadPerSec = 0.95
const maximumExitSpeedMps = 0.65
const sideExitLateralM = 2.1
const sideExitForwardM = 0.36
const bowExitM = 2.95
const sternExitM = -2.6
const exitClearanceRadiusM = 0.43
const maximumExitDepthM = 0.55

function navigable(point: Point) {
  const byDock = Math.abs(point.x - harborDock.x) < halfDockWidthM + dockSideClearanceM
    && point.z > dockEndZ - dockEndClearanceM && point.z < harborDock.firstZ + dockStartClearanceM
  return !byDock && withinSkiffBoundary(point) && waterDepth(point) >= minimumNavigableDepthM
}

function hullIsNavigable(pose: Pose) {
  return [offset(pose, 0, hullBowProbeM), offset(pose, 0, hullSternProbeM), offset(pose, hullPortProbeM, 0), offset(pose, hullStarboardProbeM, 0)].every(navigable)
}

export function restoreSkiff(saved: Pose = skiffStart): Skiff {
  return { ...(hullIsNavigable(saved) ? saved : skiffStart), speed: 0 }
}

export function stepSkiff(skiff: Skiff, paddles: readonly Input[], dt: number) {
  const thrust = paddles.reduce((sum, input) => sum + input.z, 0)
  const steering = paddles.reduce((sum, input) => sum + input.x, 0)
  const target = Math.max(maximumReverseSpeedMps, Math.min(maximumForwardSpeedMps, thrust * paddleSpeedMps))
  const acceleration = (thrust === 0 ? coastDecelerationMps2 : paddleAccelerationMps2) * dt
  skiff.speed += Math.max(-acceleration, Math.min(acceleration, target - skiff.speed))
  const heading = skiff.heading + Math.max(-1, Math.min(1, steering)) * dt * turnRateRadPerSec
  const candidate = { ...offset({ ...skiff, heading }, 0, skiff.speed * dt), heading }
  if (hullIsNavigable(candidate)) Object.assign(skiff, candidate)
  else skiff.speed = 0
  return paddles.every((input) => input.x === 0 && input.z === 0)
}

export function skiffExit(skiff: Skiff, seat: Player['seat']) {
  if (Math.abs(skiff.speed) > maximumExitSpeedMps) return
  const side = seat === 'port' ? -1 : 1
  const locations = [offset(skiff, side * sideExitLateralM, sideExitForwardM), offset(skiff, -side * sideExitLateralM, sideExitForwardM), offset(skiff, 0, bowExitM), offset(skiff, 0, sternExitM)]
  return locations.find((point) => canWalkAt(point, exitClearanceRadiusM, waterLevel - maximumExitDepthM))
}
