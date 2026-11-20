import { harborDockPiles } from './world.ts'
import type { GullPerch } from './gull-flight.ts'

export const starterGullPerches: readonly GullPerch[] = harborDockPiles.slice(1).map(({ x, z, top }, i) => ({
  x, z, y: top, heading: Math.PI / 2 + (i % 3 - 1) * .095,
}))

export const saltwindGullStops = [-218.9, -217.8, -216.6, -215.3].map((z, i) => ({
  x: -286.7 - i % 2 * .22, z, heading: Math.PI / 2 + (i % 3 - 1) * .09,
}))
