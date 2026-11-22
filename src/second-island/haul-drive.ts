import { haulerSpec, oreHaulerWalkingVolume, oreHaulerWheel } from '../assets/geometry/ore-hauler.ts'
import { advanceHauler, type HaulPose, type HaulInput } from '../simulation/ore-truck.ts'
import { offset, type Pose } from '../world.ts'
import { parkedGroundPose } from '../truck-pose.ts'
import { surfaceHeight, waterHeight } from './terrain.ts'
import type { ScenerySolids } from './walking.ts'

const fordDepth = 0.38
const groundStepAllowance = 0.28
const gradeAllowance = 0.62
const bodyClearanceRadius = 1.22
const lowerBodyClearance = 0.42

const innerChassisProbe = 1.15
const outerChassisProbe = 3.45
const stations = [-outerChassisProbe, -innerChassisProbe, innerChassisProbe, outerChassisProbe]
const wheels = {
  axles: [haulerSpec.axles[0], oreHaulerWheel.steeringAxle] as const,
  halfTrack: oreHaulerWheel.halfTrack,
  radius: haulerSpec.wheel,
}
export const haulerPose = (p: Pose) => parkedGroundPose(p, wheels, ({ x, z }) => surfaceHeight(x, z))

export function stepHauler(pose: HaulPose, input: HaulInput, solids: ScenerySolids, loaded: boolean) {
  const next = { ...pose }
  const steering = advanceHauler(next, input, loaded)
  const travel = next.speed * input.dt
  // Sample the bumper sweep as well as the chassis. Road decks are drivable surfaces.
  if (travel) for (const along of stations) {
    const { x, z } = offset(next, 0, along)
    const ground = surfaceHeight(x, z)
    const prev = offset(pose, 0, along)
    if (waterHeight(x, z) - ground > fordDepth || Math.abs(surfaceHeight(prev.x, prev.z) - ground) > groundStepAllowance + Math.abs(travel) * gradeAllowance
      || solids.at(x, z, bodyClearanceRadius).some((b) => b.top > ground + lowerBodyClearance && b.bottom < ground + oreHaulerWalkingVolume.top)) {
      pose.speed = 0
      return { steering, step: null }
    }
  }
  Object.assign(pose, next)
  return { steering, step: input }
}
