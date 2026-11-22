import { barrowFrame, barrowTray, barrowWheel } from './assets/geometry/barrow.ts'
import { walkingHeight } from './terrain.ts'
import { localPoint, offset, type Point, type Pose } from './world.ts'

const pushOffset = 0.94
const lift = 0.13
const { halfWidth: trayHalfWidth, halfDepth: trayHalfDepth, rimHeight } = barrowTray
const { radius: wheelRadius, axleZ: wheelZ, halfWidth: wheelHalfWidth } = barrowWheel
export const barrowRig = {
  pushOffset,
  trayHalfWidth,
  trayHalfDepth,
  rimHeight,
  wheelRadius,
  wheelZ,
  wheelHalfWidth,
  grip: { ...barrowFrame.grip.center },
  lift,
}

const wheelDiameter = wheelRadius + wheelRadius
// Upright support envelopes also provide Cannon's tray-then-wheel collision shapes.
export const barrowSolids = [
  { halfWidth: trayHalfWidth, halfDepth: trayHalfDepth, z: 0, height: rimHeight },
  { halfWidth: wheelHalfWidth, halfDepth: wheelRadius, z: wheelZ, height: wheelDiameter },
]

// Overlapping circles cover the tray’s corners and the wheel during a push.
const trayClearanceX = 0.22
const trayClearanceZ = 0.31
const trayClearanceRadius = 0.23
const wheelClearanceRadius = 0.15
const half = 0.5
export const barrowClearance = [
  ...[-trayClearanceX, trayClearanceX].flatMap((x) => [-trayClearanceZ, 0, trayClearanceZ].map((z) => ({ x, z, radius: trayClearanceRadius }))),
  { x: 0, z: wheelZ + wheelRadius * half, radius: wheelClearanceRadius },
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
