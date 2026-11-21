import { walkingHeight } from './terrain.ts'
import { localPoint, offset, type Point, type Pose } from './world.ts'

export const barrowRig = {
  pushOffset: 0.94,
  trayHalfWidth: 0.39,
  trayHalfDepth: 0.50,
  rimHeight: 0.82,
  wheelRadius: 0.26,
  wheelZ: 0.55,
  wheelHalfWidth: 0.095,
  grip: { x: 0.46, y: 0.90, z: -0.48 },
  lift: 0.13,
}

const { trayHalfWidth, trayHalfDepth, rimHeight, wheelRadius, wheelZ, wheelHalfWidth } = barrowRig
export const barrowSolids = [
  { halfWidth: trayHalfWidth, halfDepth: trayHalfDepth, z: 0, height: rimHeight },
  { halfWidth: wheelHalfWidth, halfDepth: wheelRadius, z: wheelZ, height: wheelRadius * 2 },
]

// Overlapping circles cover the tray’s corners and the wheel during a push.
export const barrowClearance = [
  ...[-0.22, 0.22].flatMap((x) => [-0.31, 0, 0.31].map((z) => ({ x, z, radius: 0.23 }))),
  { x: 0, z: wheelZ + wheelRadius / 2, radius: 0.15 },
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
