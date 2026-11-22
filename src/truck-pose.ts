import type { GroundDrive } from './vehicles/ground-drive.ts'
import { offset } from './world.ts'
import type { Point, Pose } from './world.ts'

const wheelCount = 4
const wheelsPerAxle = 2

export type TruckPose = Pose & { y: number, pitch: number, roll: number }
export type Truck = TruckPose & { speed: number, steering: number, braking: boolean, suspension: number[] }
type SpatialPoint = Point & { y: number }

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

export function parkedGroundPose(
  pose: Pose,
  { axles: [rear, front], halfTrack }: GroundDrive['wheels'],
  heightAt: (point: Point) => number,
  clearance = 0,
): TruckPose {
  const frontLeft = heightAt(offset(pose, -halfTrack, front))
  const frontRight = heightAt(offset(pose, halfTrack, front))
  const rearLeft = heightAt(offset(pose, -halfTrack, rear))
  const rearRight = heightAt(offset(pose, halfTrack, rear))
  return {
    ...pose,
    y: (frontLeft + frontRight + rearLeft + rearRight) / wheelCount + clearance,
    pitch: Math.atan2(rearLeft + rearRight - frontLeft - frontRight, wheelsPerAxle * (front - rear)),
    roll: Math.atan2(frontRight + rearRight - frontLeft - rearLeft, wheelCount * halfTrack),
  }
}
