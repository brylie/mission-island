import { ridgeLandingSignGeometry, ridgeRackGeometry, ridgeWindsockGeometry } from '../../assets/geometry/ridge-course.ts'
import { offset } from '../../world.ts'

export const ridgeLaunch = { x: 39, z: 128 }
export const ridgeLaunchClearance = 0.65
export const ridgeMeadow = { x: 61, z: 102 }
export const ridgeReturn = { x: 48, z: 116 }
export const ridgeHeading = Math.atan2(ridgeMeadow.x - ridgeLaunch.x, ridgeMeadow.z - ridgeLaunch.z)
export const ridgeWind = offset({ x: 0, z: 0, heading: ridgeHeading }, 0, -0.35)
export const ridgeLandingRadius = 6.6
export const ridgeApproach = { halfWidth: 7, start: -17 }
const launchPose = { ...ridgeLaunch, heading: ridgeHeading }
export const ridgeRack = { ...offset(launchPose, 2.85, 0.6), heading: ridgeHeading, geometry: ridgeRackGeometry }
export const ridgeWindsock = { ...offset(launchPose, -2.9, 2.85), geometry: ridgeWindsockGeometry }
export const ridgeLandingSign = { ...offset({ ...ridgeMeadow, heading: ridgeHeading }, 6, -7), heading: ridgeHeading, geometry: ridgeLandingSignGeometry }
export const ridgeUpdraft = { ...offset(launchPose, -10.5, 20), radius: 8.5, ceiling: 36, lift: 10 }

export { ridgeWing } from '../../assets/geometry/ridge-course.ts'
