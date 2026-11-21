import type { Input, Player, Skiff } from '../src/protocol'
import { waterDepth, waterLevel, withinSkiffBoundary } from '../src/terrain.ts'
import { dockEndZ, harborDock, offset, skiffStart } from '../src/world.ts'
import type { Point, Pose } from '../src/world'
import { canWalkAt } from '../src/simulation/movement.ts'

function navigable(point: Point) {
  const byDock = Math.abs(point.x - harborDock.x) < harborDock.width / 2 + 0.275
    && point.z > dockEndZ - 0.67 && point.z < harborDock.firstZ + 0.5
  return !byDock && withinSkiffBoundary(point) && waterDepth(point) >= 0.24
}

function hullIsNavigable(pose: Pose) {
  return [offset(pose, 0, 1.85), offset(pose, 0, -1.62), offset(pose, -0.62, 0), offset(pose, 0.62, 0)].every(navigable)
}

export function restoreSkiff(saved: Pose = skiffStart): Skiff {
  return { ...(hullIsNavigable(saved) ? saved : skiffStart), speed: 0 }
}

export function stepSkiff(skiff: Skiff, paddles: readonly Input[], dt: number) {
  const thrust = paddles.reduce((sum, input) => sum + input.z, 0)
  const steering = paddles.reduce((sum, input) => sum + input.x, 0)
  const target = Math.max(-2.5, Math.min(5.4, thrust * 3.45))
  const acceleration = (thrust === 0 ? 2.5 : 2.3) * dt
  skiff.speed += Math.max(-acceleration, Math.min(acceleration, target - skiff.speed))
  const heading = skiff.heading + Math.max(-1, Math.min(1, steering)) * dt * 0.95
  const candidate = { ...offset({ ...skiff, heading }, 0, skiff.speed * dt), heading }
  if (hullIsNavigable(candidate)) Object.assign(skiff, candidate)
  else skiff.speed = 0
  return paddles.every((input) => input.x === 0 && input.z === 0)
}

export function skiffExit(skiff: Skiff, seat: Player['seat']) {
  if (Math.abs(skiff.speed) > 0.65) return
  const side = seat === 'port' ? -1 : 1
  const locations = [offset(skiff, side * 2.1, 0.36), offset(skiff, -side * 2.1, 0.36), offset(skiff, 0, 2.95), offset(skiff, 0, -2.6)]
  return locations.find((point) => canWalkAt(point, 0.43, waterLevel - 0.55))
}
