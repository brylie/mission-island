import { Quaternion } from '@babylonjs/core/Maths/math.vector'
import { crewFootInHipSpace, crewShin, crewThigh, solveCrewLeg, type CrewGaitPose } from '../crew-gait'
import type { createCrew } from './crew'

export function fitCrewGait(crew: ReturnType<typeof createCrew>, frame: CrewGaitPose) {
  const { x, y, z } = crew.root.position
  const pose = { x, y, z, heading: crew.root.rotation.y }
  const targets = frame.feet.map((foot, i) => crewFootInHipSpace(pose, foot, i ? 1 : -1, 0))
  const reach = crewThigh + crewShin
  // Let the hips follow the lower foot on an incline without stretching the leg.
  const crouch = Math.min(.21, Math.max(frame.crouch, ...targets.map(({ x, y, z }) =>
    -y - Math.sqrt(Math.max(0, reach ** 2 - x ** 2 - z ** 2)))))
  crew.body.position.y = -crouch
  for (const [i, target] of targets.entries()) {
    const { roll, pitch, bend } = solveCrewLeg(target.x, target.y + crouch, target.z)
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
