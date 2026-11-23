import { fullTurnRadians } from './angles.ts'
import { hash } from './noise.ts'

// Quintic fade keeps the second derivative continuous, so eroded slopes do not
// inherit lattice creases.
const fadeA = 6
const fadeB = 15
const fadeC = 10
const ridgeOffset = 1

function fade(t: number) {
  return t * t * t * (t * (t * fadeA - fadeB) + fadeC)
}

function gradientDot(ix: number, iz: number, seed: number, dx: number, dz: number) {
  const angle = hash(ix, iz, seed) * fullTurnRadians
  return Math.cos(angle) * dx + Math.sin(angle) * dz
}

// Seeded 2D gradient (Perlin) noise, roughly in [-0.7, 0.7], zero at lattice points.
function gradientNoise(x: number, z: number, seed: number) {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = x - ix, fz = z - iz
  const u = fade(fx), v = fade(fz)
  const a = gradientDot(ix, iz, seed, fx, fz)
  const b = gradientDot(ix + 1, iz, seed, fx - 1, fz)
  const c = gradientDot(ix, iz + 1, seed, fx, fz - 1)
  const d = gradientDot(ix + 1, iz + 1, seed, fx - 1, fz - 1)
  const top = a + (b - a) * u
  return top + (c + (d - c) * u - top) * v
}

interface Octaves {
  wavelength: number
  octaves: number
  lacunarity: number
  gain: number
}

// Fractal Brownian motion: each octave is `lacunarity` times finer and `gain`
// times weaker, so bays hold coves and coves hold smaller coves.
export function fbm(x: number, z: number, seed: number, { wavelength, octaves, lacunarity, gain }: Octaves) {
  let sum = 0, amplitude = 1, frequency = 1 / wavelength
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * gradientNoise(x * frequency, z * frequency, seed + i)
    amplitude *= gain
    frequency *= lacunarity
  }
  return sum
}

// Ridged multifractal noise (after Musgrave): sharp crests where the noise
// crosses zero, with each octave weighted by the one before so detail gathers
// on the ridges rather than in the valleys. Returns roughly 0 to 1.
export function ridgedMultifractal(x: number, z: number, seed: number, { wavelength, octaves, lacunarity, gain }: Octaves) {
  let sum = 0, weight = 1, amplitude = 1, frequency = 1 / wavelength, total = 0
  for (let i = 0; i < octaves; i++) {
    let signal = ridgeOffset - Math.abs(gradientNoise(x * frequency, z * frequency, seed + i))
    signal *= signal * weight
    weight = Math.min(1, Math.max(0, signal * gain + gain))
    sum += signal * amplitude
    total += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }
  return sum / total
}
