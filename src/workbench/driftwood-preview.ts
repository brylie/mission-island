import { landscapeDuration } from '../playtest-link.ts'
import { createDriftwoodSchool } from '../simulation/driftwood-school.ts'
import { schoolStep } from '../simulation/fish-school.ts'

// A saved landscape view can seek in either direction without a game connection.
export function previewDriftwood() {
  let school = createDriftwoodSchool(68)
  let frame = school.frame(), tick = 0
  return (time: number) => {
    const target = Math.floor(Math.min(landscapeDuration, Math.max(0, time)) / schoolStep)
    if (target < tick) {
      school = createDriftwoodSchool(68)
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
