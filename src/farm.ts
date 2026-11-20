import { distance } from './world.ts'
import type { Point } from './world.ts'

export const farm = { x: 24, z: -12 }
export const market = { x: 39, z: 5.9 }
export const plotSize = 1.55
export const growthSeconds = 24
export const seedPrice = 1
export const prices = { fish: 2, carrots: 3 }
export const farmPlots = [-1.12, 1.12].flatMap((z) => [-2.24, 0, 2.24].map((x) => ({ x: farm.x + x, z: farm.z + z })))

export type PlotStage = 'grass' | 'tilled' | 'planted' | 'watered' | 'ripe'
export type Goods = Record<keyof typeof prices, number>

export function saleValue(goods: Goods) {
  return goods.fish * prices.fish + goods.carrots * prices.carrots
}

export function nearbyPlot(point: Point) {
  let nearest = -1
  let range = 1.9
  for (const [index, plot] of farmPlots.entries()) {
    const gap = distance(plot, point)
    if (gap >= range) continue
    nearest = index
    range = gap
  }
  return nearest
}
