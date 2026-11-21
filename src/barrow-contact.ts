import { barrowRig } from './barrow.ts'
import { routeContactHeight } from './route-contact.ts'
import { offset, type Pose } from './world.ts'

const { wheelHalfWidth, wheelRadius, wheelZ } = barrowRig
const wheelSamples = [-wheelHalfWidth * 0.82, 0, wheelHalfWidth * 0.82].flatMap((x) =>
  [-0.20, -0.14, -0.075, 0, 0.075, 0.14, 0.20].map((z) => ({
    x,
    z: z + wheelZ,
    lift: Math.sqrt(wheelRadius ** 2 - z ** 2) - wheelRadius,
  })))

export function barrowWheelGround(pose: Pose) {
  let ground = -Infinity
  for (const { x, z, lift } of wheelSamples) ground = Math.max(ground, routeContactHeight(offset(pose, x, z)) + lift)
  return ground
}
