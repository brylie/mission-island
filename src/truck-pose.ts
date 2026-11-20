import { groundHeight } from './terrain.ts'
import { offset } from './world.ts'
import type { Point, Pose } from './world.ts'

export type TruckPose = Pose & { y: number; pitch: number; roll: number }
export type Truck = TruckPose & { speed: number; steering: number; braking: boolean; suspension: number[] }
type SpatialPoint = Point & { y: number }

export const wheelRadius = 0.48
export const wheelTrack = 1.2
export const wheelAxles = [-1.89, 1.87]

function basis({ pitch, heading, roll }: TruckPose) {
  const c = Math.cos(heading), s = Math.sin(heading)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const cr = Math.cos(roll), sr = Math.sin(roll)
  return {
    right: { x: c * cr + s * sp * sr, y: cp * sr, z: -s * cr + c * sp * sr },
    up: { x: -c * sr + s * sp * cr, y: cp * cr, z: s * sr + c * sp * cr },
    forward: { x: s * cp, y: -sp, z: c * cp },
  }
}

export function truckPoint(pose: TruckPose, x: number, y: number, z: number): SpatialPoint {
  const { right, up, forward } = basis(pose)
  return {
    x: pose.x + right.x * x + up.x * y + forward.x * z,
    y: pose.y + right.y * x + up.y * y + forward.y * z,
    z: pose.z + right.z * x + up.z * y + forward.z * z,
  }
}

export function truckSurface(pose: TruckPose, point: Point, height: number) {
  const { right, up, forward } = basis(pose)
  const dx = point.x - pose.x - up.x * height
  const dz = point.z - pose.z - up.z * height
  const determinant = right.x * forward.z - right.z * forward.x
  const x = (dx * forward.z - dz * forward.x) / determinant
  const z = (dz * right.x - dx * right.z) / determinant
  return { x, z, y: pose.y + right.y * x + up.y * height + forward.y * z }
}

export function parkedTruckPose(pose: Pose, clearance = 0): TruckPose {
  const [rear, front] = wheelAxles
  const frontLeft = groundHeight(offset(pose, -wheelTrack, front))
  const frontRight = groundHeight(offset(pose, wheelTrack, front))
  const rearLeft = groundHeight(offset(pose, -wheelTrack, rear))
  const rearRight = groundHeight(offset(pose, wheelTrack, rear))
  return {
    ...pose,
    y: (frontLeft + frontRight + rearLeft + rearRight) / 4 + clearance,
    pitch: Math.atan2(rearLeft + rearRight - frontLeft - frontRight, 2 * (front - rear)),
    roll: Math.atan2(frontRight + rearRight - frontLeft - rearLeft, 4 * wheelTrack),
  }
}
