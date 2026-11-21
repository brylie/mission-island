import { advanceHauler, type HaulPose, type HaulInput } from '../simulation/ore-truck.ts'
import { offset, type Pose } from '../world.ts'
import { parkedGroundPose } from '../truck-pose.ts'
import { surfaceHeight, waterHeight } from './terrain.ts'
import type { ScenerySolids } from './walking.ts'

const wheels = { axles: [-2.97, 2.8] as const, halfTrack: 1.02, radius: .54 }
export const haulerPose = (p: Pose) => parkedGroundPose(p, wheels, ({ x, z }) => surfaceHeight(x, z))

export function stepHauler(pose: HaulPose, input: HaulInput, solids: ScenerySolids, loaded: boolean) {
  const next = { ...pose }
  const steering = advanceHauler(next, input, loaded)
  const travel = next.speed * input.dt
  // Sample the bumper sweep as well as the chassis. Road decks are drivable surfaces.
  if (travel) for (const along of [-3.45, -1.15, 1.15, 3.45]) {
    const { x, z } = offset(next, 0, along)
    const ground = surfaceHeight(x, z)
    const prev = offset(pose, 0, along)
    if (waterHeight(x, z) - ground > .38 || Math.abs(surfaceHeight(prev.x, prev.z) - ground) > .28 + Math.abs(travel) * .62 ||
      solids.at(x, z, 1.22).some(b => b.top > ground + .42 && b.bottom < ground + 2.65)) {
      pose.speed = 0
      return { steering, step: null }
    }
  }
  Object.assign(pose, next)
  return { steering, step: input }
}
