import { marketAwningGeometry } from '../../assets/geometry/market-awning.ts'
import { market } from '../../farm.ts'
import { walkingHeight } from '../../terrain.ts'

const backZ = 5.075
const hemZ = 6.43
const drainZ = 7.29
const geometry = marketAwningGeometry

const back = { z: backZ, y: geometry.backHeight }
const hem = { z: hemZ, y: geometry.hemHeight }
const spout = { x: market.x - geometry.halfWidth - geometry.spout.beyondEdge, y: geometry.spout.height, z: hem.z + geometry.spout.aheadOfHem }
const splash = { x: spout.x - geometry.splashOffset, z: spout.z }
const drain = { x: splash.x, z: drainZ }
const gutterZ = hem.z + geometry.gutter.aheadOfHem
const base = walkingHeight(splash)
const catchHeight = base + geometry.catchRise
const grateHeight = walkingHeight(drain) + geometry.grateRise

export const marketAwningSite = { back, hem, spout, splash, drain, gutterZ, base, catchHeight, grateHeight }

export function clothHeight(z: number) {
  const t = (z - back.z) / (hem.z - back.z)
  return back.y + (hem.y - back.y) * t - geometry.clothSag * Math.sin(t * Math.PI)
}

export function gutterY(x: number) {
  return geometry.gutter.lowEndHeight + (x - spout.x) * geometry.gutter.slope
}
