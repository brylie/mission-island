import { brinewickGullPosts } from './worlds/saltwind/layout/scenery.ts'
import { harborDockPiles } from './world.ts'
import type { GullPerch } from './gull-flight.ts'

const dockPerchYawStep = 0.095
const quayPerchYawStep = 0.09
const half = 0.5
const perchFacing = Math.PI * half
const perchYawCycle = 3
const alternatePost = 2

export const starterGullPerches: readonly GullPerch[] = harborDockPiles.slice(1).map(({ x, z, top }, i) => ({
  x,
  z,
  y: top,
  heading: perchFacing + (i % perchYawCycle - 1) * dockPerchYawStep,
}))

export const saltwindGullStops = brinewickGullPosts.z.map((z, i) => ({
  x: brinewickGullPosts.x - i % alternatePost * brinewickGullPosts.alternatingInset,
  z,
  heading: perchFacing + (i % perchYawCycle - 1) * quayPerchYawStep,
}))
