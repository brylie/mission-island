import { createCoastalSchool } from '../simulation/coastal-school.ts'
import { schoolStep, type SchoolThreat } from '../simulation/fish-school.ts'
import { seaLevel, waterfront } from './sites.ts'
import { groundHeight } from './terrain.ts'

const shallowsEastOffset = 4.2
const shallowsSouthOffset = 7.7
const idleReplaySeconds = 96
const tickBoundaryTolerance = 1e-8

// A visible strip of water on the east side of the Sandspit pier.
export const sandspitShallows = { x: waterfront.fishing.x + shallowsEastOffset, z: waterfront.fishing.z - shallowsSouthOffset }
const idleReplayLimit = idleReplaySeconds / schoolStep
const seed = 68
const createSchool = () => createCoastalSchool(seed, sandspitShallows, ({ x, z }) => seaLevel - groundHeight(x, z))

export function previewSandspit() {
  let school = createSchool()
  let tick = 0
  let frame = school.frame()
  return (time: number, threats: readonly SchoolThreat[], seek = false) => {
    const target = Math.max(0, Math.floor((time + tickBoundaryTolerance) / schoolStep))
    // A still view replays the undisturbed school. Local swimming history is not part of a camera link.
    const restore = seek || target < tick || target - tick > idleReplayLimit
    if (restore) {
      school = createSchool()
      tick = Math.max(0, target - idleReplayLimit)
    }
    if (restore || tick < target) {
      while (tick < target) {
        school.step(restore ? [] : threats)
        tick++
      }
      frame = school.frame()
    }
    return frame
  }
}
