import { blend, hash, wrap } from '../math/noise.ts'
import { smoothstep } from '../math/smoothstep.ts'

const half = 0.5
const fullTurn = Math.PI + Math.PI
const centreMargin = 0.15
const centreSpread = 0.7
const facetAspect = 0.86
const toneSeedOffset = 2

export const wave = (phase: number) => half + half * Math.sin(fullTurn * phase)
export const fraction = (n: number) => n - Math.floor(n)
export const smooth = (low: number, high: number, value: number) => {
  return smoothstep((value - low) / (high - low))
}

export function cell(u: number, v: number, count: number, seed: number, facet = 0) {
  const x = u * count, y = v * count
  const col = Math.floor(x), row = Math.floor(y)
  let distance = Infinity, next = Infinity, dx = 0, dy = 0, tone = 0
  for (let j = row - 1; j <= row + 1; j++) {
    for (let i = col - 1; i <= col + 1; i++) {
      const a = wrap(i, count), b = wrap(j, count)
      const px = x - i - centreMargin - centreSpread * hash(a, b, seed)
      const py = y - j - centreMargin - centreSpread * hash(a, b, seed + 1)
      const d = blend(Math.hypot(px, py), Math.abs(px) + Math.abs(py) * facetAspect, facet)
      if (d < distance) {
        next = distance
        distance = d
        dx = px
        dy = py
        tone = hash(a, b, seed + toneSeedOffset)
      }
      else if (d < next) next = d
    }
  }
  return { distance, edge: (next - distance) * half, dx, dy, tone }
}

export type Sample = [height: number, tone: number, accent?: number, emission?: number]
export interface Point {
  u: number
  v: number
  n: number
  seed: number
  wear: number
  patch: number
  fine: number
}
