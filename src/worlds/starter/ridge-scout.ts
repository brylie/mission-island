import { ridgeLandingSignGeometry, ridgeRackGeometry, ridgeWindsockGeometry } from '../../assets/geometry/ridge-course.ts'
import { offset } from '../../world.ts'
import { ridgeCourseLayout } from './layout/sites.ts'

export const { launch: ridgeLaunch, launchClearance: ridgeLaunchClearance, meadow: ridgeMeadow, returnTrail: ridgeReturn } = ridgeCourseLayout
export const ridgeHeading = Math.atan2(ridgeMeadow.x - ridgeLaunch.x, ridgeMeadow.z - ridgeLaunch.z)
export const ridgeWind = offset({ x: 0, z: 0, heading: ridgeHeading }, 0, ridgeCourseLayout.windSpeed)
export const { landingRadius: ridgeLandingRadius, approach: ridgeApproach } = ridgeCourseLayout
const launchPose = { ...ridgeLaunch, heading: ridgeHeading }
export const ridgeRack = { ...offset(launchPose, ridgeCourseLayout.rack.x, ridgeCourseLayout.rack.z), heading: ridgeHeading, geometry: ridgeRackGeometry }
export const ridgeWindsock = { ...offset(launchPose, ridgeCourseLayout.windsock.x, ridgeCourseLayout.windsock.z), geometry: ridgeWindsockGeometry }
export const ridgeLandingSign = { ...offset({ ...ridgeMeadow, heading: ridgeHeading }, ridgeCourseLayout.landingSign.x, ridgeCourseLayout.landingSign.z), heading: ridgeHeading, geometry: ridgeLandingSignGeometry }
const { x, z, ...updraftProfile } = ridgeCourseLayout.updraft
export const ridgeUpdraft = { ...offset(launchPose, x, z), ...updraftProfile }

export { ridgeWing } from '../../assets/geometry/ridge-course.ts'
