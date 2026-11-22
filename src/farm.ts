import { distance } from './world.ts'
import type { Point } from './world.ts'

const farmX = 24
const farmZ = -12
const marketX = 39
const marketZ = 5.9
const clothingCounterX = 40.68
export const farm = { x: farmX, z: farmZ }
export const market = { x: marketX, z: marketZ }
export const marketTradeReach = 2.25
export const clothingCounter = { x: clothingCounterX, z: marketZ }
export const plotSize = 1.55
export const plotSurfaceOffset = 0.062
export const growthSeconds = 24
export const seedPrice = 1
const fishSalePrice = 2
const carrotSalePrice = 3
export const prices = { fish: fishSalePrice, carrots: carrotSalePrice }
const plotRowOffset = 1.12
const plotColumnOffset = 2.24
const plotReach = 1.9
export const farmPlots = [-plotRowOffset, plotRowOffset].flatMap((z) => [-plotColumnOffset, 0, plotColumnOffset].map((x) => ({ x: farm.x + x, z: farm.z + z })))

export type PlotStage = 'grass' | 'tilled' | 'planted' | 'watered' | 'ripe'
export type Goods = Record<keyof typeof prices, number>

export function saleValue(goods: Goods) {
  return goods.fish * prices.fish + goods.carrots * prices.carrots
}

export function nearbyPlot(point: Point) {
  let nearest = -1
  let range = plotReach
  for (const [index, plot] of farmPlots.entries()) {
    const gap = distance(plot, point)
    if (gap >= range) continue
    nearest = index
    range = gap
  }
  return nearest
}
