export const wrap = (value: number, period: number) => ((value % period) + period) % period
export const blend = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (value: number) => Math.max(0, Math.min(1, value))

export function hash(x: number, y: number, seed: number) {
  let n = Math.imul(x + 103, 1597334677) ^ Math.imul(y + 89, 3812015801) ^ Math.imul(seed, 1103515245)
  n = Math.imul(n ^ (n >>> 15), 2246822519)
  return ((n ^ (n >>> 13)) >>> 0) / 4294967296
}

export function valueNoise(u: number, v: number, cells: number, seed: number, yCells = cells, periodic = true) {
  const x = u * cells
  const y = v * yCells
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const point = (dx: number, dy: number) =>
    hash(periodic ? wrap(ix + dx, cells) : ix + dx, periodic ? wrap(iy + dy, yCells) : iy + dy, seed)
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  return blend(blend(point(0, 0), point(1, 0), sx), blend(point(0, 1), point(1, 1), sx), sy)
}
