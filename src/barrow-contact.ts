import { barrowRig } from './barrow.ts'
import { routeContactHeight } from './route-contact.ts'
import { offset, type Pose } from './world.ts'

const { wheelHalfWidth, wheelRadius, wheelZ } = barrowRig
const treadWidthFraction = 0.82
const outerSample = 0.2
const middleSample = 0.14
const innerSample = 0.075
const treadHalfWidth = wheelHalfWidth * treadWidthFraction
const wheelRadiusSquared = wheelRadius * wheelRadius
const wheelSamples = [-treadHalfWidth, 0, treadHalfWidth].flatMap((x) =>
  [-outerSample, -middleSample, -innerSample, 0, innerSample, middleSample, outerSample].map((z) => ({
    x,
    z: z + wheelZ,
    lift: Math.sqrt(wheelRadiusSquared - z * z) - wheelRadius,
  })))

export function barrowWheelGround(pose: Pose) {
  let ground = -Infinity
  for (const { x, z, lift } of wheelSamples) ground = Math.max(ground, routeContactHeight(offset(pose, x, z)) + lift)
  return ground
}
