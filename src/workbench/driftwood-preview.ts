import { landscapeDuration } from '../playtest-link.ts'
import { createDriftwoodSchool } from '../simulation/driftwood-school.ts'
import { schoolStep } from '../simulation/fish-school.ts'

// A saved landscape view can seek in either direction without a game connection.
const previewSchoolSeed = 68

export function previewDriftwood() {
  let school = createDriftwoodSchool(previewSchoolSeed)
  let frame = school.frame(), tick = 0
  return (time: number) => {
    const target = Math.floor(Math.min(landscapeDuration, Math.max(0, time)) / schoolStep)
    if (target < tick) {
      school = createDriftwoodSchool(previewSchoolSeed)
      frame = school.frame()
      tick = 0
    }
    while (tick < target) {
      frame = school.step([])
      tick++
    }
    return frame
  }
}
