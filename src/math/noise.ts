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

// Fractal Brownian noise built from centered value noise. Each band contributes
// up to its amplitude, with `cells` lattice intervals per unit of position.
export function fractalNoise1D(position: number, seed: number,
  bands: readonly { cells: number; amplitude: number }[], periodic = true) {
  let sample = 0
  for (const [index, { cells, amplitude }] of bands.entries()) {
    sample += amplitude * (2 * valueNoise(position, 0, cells, seed + index, 1, periodic) - 1)
  }
  return sample
}

// A mean-reverting Brownian process (Ornstein–Uhlenbeck). Correlation time is in
// seconds. The stationary standard deviation uses the same units as the output.
export function createWander(random: () => number, dt: number, correlationTime: number, deviation: number) {
  const decay = Math.exp(-dt / correlationTime)
  const step = deviation * Math.sqrt(1 - decay ** 2)
  return (previous: number) => {
    const normal = Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
    return previous * decay + step * normal
  }
}
