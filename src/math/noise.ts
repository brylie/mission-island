import { fullTurnRadians } from './angles.ts'
import { smoothstepUnit } from './smoothstep.ts'

const hashXOffset = 103
const hashXMultiplier = 1597334677
const hashYOffset = 89
const hashYMultiplier = 3812015801
const hashSeedMultiplier = 1103515245
const hashMixShift = 15
const hashMixMultiplier = 2246822519
const hashOutputShift = 13
const uint32Range = 0x1_0000_0000
const bipolarOutputSpan = 2
const variancePower = 2
const negativeNormalScale = -2

export const wrap = (value: number, period: number) => ((value % period) + period) % period
export const blend = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (value: number) => Math.max(0, Math.min(1, value))

export function hash(x: number, y: number, seed: number) {
  let n = Math.imul(x + hashXOffset, hashXMultiplier) ^ Math.imul(y + hashYOffset, hashYMultiplier) ^ Math.imul(seed, hashSeedMultiplier)
  n = Math.imul(n ^ (n >>> hashMixShift), hashMixMultiplier)
  return ((n ^ (n >>> hashOutputShift)) >>> 0) / uint32Range
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
  const sx = smoothstepUnit(fx)
  const sy = smoothstepUnit(fy)
  return blend(blend(point(0, 0), point(1, 0), sx), blend(point(0, 1), point(1, 1), sx), sy)
}

// Fractal Brownian noise built from centered value noise. Each band contributes
// up to its amplitude, with `cells` lattice intervals per unit of position.
export function fractalNoise1D(position: number, seed: number, bands: readonly { cells: number, amplitude: number }[], periodic = true) {
  let sample = 0
  for (const [index, { cells, amplitude }] of bands.entries()) {
    sample += amplitude * (bipolarOutputSpan * valueNoise(position, 0, cells, seed + index, 1, periodic) - 1)
  }
  return sample
}

// A mean-reverting Brownian process (Ornstein–Uhlenbeck). Correlation time is in
// seconds. The stationary standard deviation uses the same units as the output.
export function createWander(random: () => number, dt: number, correlationTime: number, deviation: number) {
  const decay = Math.exp(-dt / correlationTime)
  const step = deviation * Math.sqrt(1 - decay ** variancePower)
  return (previous: number) => {
    const normal = Math.sqrt(negativeNormalScale * Math.log(1 - random())) * Math.cos(fullTurnRadians * random())
    return previous * decay + step * normal
  }
}
