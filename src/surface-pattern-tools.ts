import { blend, clamp, hash, wrap } from './surface-noise.ts'

export const wave = (phase: number) => .5 + .5 * Math.sin(2 * Math.PI * phase)
export const fraction = (n: number) => n - Math.floor(n)
export const smooth = (low: number, high: number, value: number) => {
  const t = clamp((value - low) / (high - low))
  return t * t * (3 - 2 * t)
}

export function cell(u: number, v: number, count: number, seed: number, facet = 0) {
  const x = u * count, y = v * count
  const col = Math.floor(x), row = Math.floor(y)
  let distance = Infinity, next = Infinity, dx = 0, dy = 0, tone = 0
  for (let j = row - 1; j <= row + 1; j++) {
    for (let i = col - 1; i <= col + 1; i++) {
      const a = wrap(i, count), b = wrap(j, count)
      const px = x - i - .15 - .7 * hash(a, b, seed)
      const py = y - j - .15 - .7 * hash(a, b, seed + 1)
      const d = blend(Math.hypot(px, py), Math.abs(px) + Math.abs(py) * .86, facet)
      if (d < distance) {
        next = distance
        distance = d
        dx = px
        dy = py
        tone = hash(a, b, seed + 2)
      } else if (d < next) next = d
    }
  }
  return { distance, edge: (next - distance) * .5, dx, dy, tone }
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
