import { walkingHeight } from './terrain.ts'
import { localPoint, offset, type Point, type Pose } from './world.ts'

export const barrowRig = {
  pushOffset: .94,
  trayHalfWidth: .39,
  trayHalfDepth: .50,
  rimHeight: .82,
  wheelRadius: .26,
  wheelZ: .55,
  wheelHalfWidth: .095,
  grip: { x: .46, y: .90, z: -.48 },
  lift: .13,
}

const { trayHalfWidth, trayHalfDepth, rimHeight, wheelRadius, wheelZ, wheelHalfWidth } = barrowRig
export const barrowSolids = [
  { halfWidth: trayHalfWidth, halfDepth: trayHalfDepth, z: 0, height: rimHeight },
  { halfWidth: wheelHalfWidth, halfDepth: wheelRadius, z: wheelZ, height: wheelRadius * 2 },
]

// Overlapping circles cover the tray’s corners and the wheel during a push.
export const barrowClearance = [
  ...[-.22, .22].flatMap(x => [-.31, 0, .31].map(z => ({ x, z, radius: .23 }))),
  { x: 0, z: wheelZ + wheelRadius / 2, radius: .15 },
]

export function pushedBarrowPose(player: Pose): Pose {
  return { ...offset(player, 0, barrowRig.pushOffset), heading: player.heading }
}

export function barrowContains(pose: Pose, point: Point, padding: number) {
  const local = localPoint(pose, point)
  return barrowSolids.some(({ halfWidth, halfDepth, z }) =>
    Math.abs(local.x) < halfWidth + padding && Math.abs(local.z - z) < halfDepth + padding)
}

export function barrowTop(pose: Pose, point: Point, padding: number) {
  const local = localPoint(pose, point)
  const solid = barrowSolids.find(({ halfWidth, halfDepth, z }) =>
    Math.abs(local.x) < halfWidth + padding && Math.abs(local.z - z) < halfDepth + padding)
  return solid ? walkingHeight(pose) + solid.height : -Infinity
}
