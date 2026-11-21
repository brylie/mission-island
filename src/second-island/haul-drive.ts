import { offset, type Pose } from '../world.ts'
import { parkedGroundPose } from '../truck-pose.ts'
import { surfaceHeight, waterHeight } from './terrain.ts'
import type { ScenerySolids } from './walking.ts'

const wheels = { axles: [-2.97, 2.8] as const, halfTrack: 1.02, radius: .54 }
export const haulerPose = (p: Pose) => parkedGroundPose(p, wheels, ({ x, z }) => surfaceHeight(x, z))

export function stepHauler(pose: Pose & { speed: number }, throttle: number, steer: number, brake: boolean,
  dt: number, solids: ScenerySolids, loaded: boolean) {
  const desired = brake ? 0 : throttle * (throttle < 0 ? 5 : loaded ? 15 : 19)
  const rate = brake ? 18 : !throttle ? 4 : throttle * pose.speed < 0 ? 12 : loaded ? 3.6 : 5
  pose.speed += Math.sign(desired - pose.speed) * Math.min(Math.abs(desired - pose.speed), dt * rate)
  const travel = pose.speed * dt
  const radius = 6.1 + .24 * Math.abs(pose.speed)
  const steering = steer * Math.atan((wheels.axles[1] - wheels.axles[0]) / radius)
  if (!travel) return steering
  const heading = pose.heading + steer * travel / radius
  const next = { heading, x: pose.x + Math.sin(heading) * travel, z: pose.z + Math.cos(heading) * travel }
  // Sample the bumper sweep as well as the chassis. Road decks are drivable surfaces.
  for (const along of [-3.45, -1.15, 1.15, 3.45]) {
    const { x, z } = offset(next, 0, along)
    const ground = surfaceHeight(x, z)
    const prev = offset(pose, 0, along)
    if (waterHeight(x, z) - ground > .38 || Math.abs(surfaceHeight(prev.x, prev.z) - ground) > .28 + Math.abs(travel) * .62 ||
      solids.at(x, z, 1.22).some(b => b.top > ground + .42 && b.bottom < ground + 2.65)) {
      pose.speed = 0
      return steering
    }
  }
  Object.assign(pose, next)
  return steering
}
