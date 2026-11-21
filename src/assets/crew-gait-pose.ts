import { Quaternion } from '@babylonjs/core/Maths/math.vector.js'
import { crewFootInHipSpace, crewShin, crewThigh, solveCrewLeg, type CrewGaitPose } from '../crew-gait.ts'
import type { createCrew } from './crew'

export function fitCrewGait(crew: ReturnType<typeof createCrew>, frame: CrewGaitPose) {
  const { x, y, z } = crew.root.position
  const pose = { x, y, z, heading: crew.root.rotation.y }
  const targets = frame.feet.map((foot, i) => crewFootInHipSpace(pose, foot, i ? 1 : -1, 0))
  // Set the pelvis from the supporting ankle. During recovery the knee
  // follows the authored swing, with the rolling outsole as its clearance limit.
  const down = targets.map((target, i) => {
    const reachSquared = crewThigh ** 2 + crewShin ** 2 + 2 * crewThigh * crewShin * Math.cos(frame.feet[i].bend)
    return Math.sqrt(Math.max(0, reachSquared - target.x ** 2 - target.z ** 2))
  })
  let support = 0, height = 0
  for (const [i, target] of targets.entries()) {
    const weight = frame.feet[i].support
    height += (target.y + down[i]) * weight
    support += weight
  }
  crew.body.position.y = Math.max(-.21, Math.min(.14, height / Math.max(1, support)))
  for (const [i, target] of targets.entries()) {
    const floor = target.y - crew.body.position.y
    const swing = Math.max(floor, -down[i])
    const ankleY = swing + (floor - swing) * frame.feet[i].support
    const { roll, pitch, bend } = solveCrewLeg(target.x, ankleY, target.z)
    const tilt = Quaternion.RotationYawPitchRoll(0, 0, roll)
    crew.legs[i].rotationQuaternion = tilt.multiply(Quaternion.RotationYawPitchRoll(0, pitch, 0))
    const shin = tilt.multiply(Quaternion.RotationYawPitchRoll(0, pitch + bend, 0))
    const foot = frame.feet[i]
    const sole = Quaternion.RotationYawPitchRoll(foot.heading - pose.heading, foot.pitch, 0)
    crew.knees[i].bend(bend, 1)
    crew.knees[i].orientFoot(Quaternion.Inverse(shin).multiply(sole), 1)
  }
}

export function relaxCrewGait(crew: ReturnType<typeof createCrew>, blend: number) {
  crew.body.position.y *= 1 - blend
  for (const [i, leg] of crew.legs.entries()) {
    leg.rotationQuaternion?.toEulerAnglesToRef(leg.rotation)
    leg.rotationQuaternion = null
    leg.rotation.z *= 1 - blend
    crew.knees[i].restFoot(blend)
  }
}
