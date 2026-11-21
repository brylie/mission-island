import { blend, clamp, fractalNoise1D, wrap } from '../../math/noise.ts'
import { island } from '../../world.ts'

const turn = 2 * Math.PI
const resolution = 4096
const step = turn / resolution
export const starterCoastSeed = 101

const features = [
  { bearing: 210, halfWidth: 34, displacement: 12 }, // The outside shoulder of the harbor.
  { bearing: 248, halfWidth: 30, displacement: -9 }, // The sheltered water beyond the terminals.
  { bearing: 275, halfWidth: 29, displacement: 11 },
  { bearing: 70, halfWidth: 65, displacement: 24 }, // Windstone's seaward point.
  { bearing: 43, halfWidth: 53, displacement: -14 },
  { bearing: 100, halfWidth: 70, displacement: -12 },
  { bearing: 142, halfWidth: 76, displacement: -15 },
]

const noiseBands = [
  { wavelength: 64, amplitude: 4.2 },
  { wavelength: 24, amplitude: 1.6 },
  { wavelength: 9, amplitude: 0.45 },
]

function baselineScale(angle: number) {
  const northern = Math.max(0, Math.sin(angle))
  return (1 + 2.85 * northern ** 2) * (1 + Math.sin(angle * 5 + 0.2) * 0.018 + Math.cos(angle * 9) * 0.013)
}

function rayLength(angle: number) {
  return Math.hypot(Math.cos(angle) * island.width / 2, Math.sin(angle) * island.length / 2)
}

const distances = [0]
let previous = { x: island.width / 2 * baselineScale(0), z: 0 }
for (let i = 1; i <= resolution; i++) {
  const angle = i * step
  const scale = baselineScale(angle)
  const point = { x: Math.cos(angle) * island.width / 2 * scale, z: Math.sin(angle) * island.length / 2 * scale }
  distances.push(distances[i - 1] + Math.hypot(point.x - previous.x, point.z - previous.z))
  previous = point
}
const perimeter = distances[resolution]

function coastDistance(bearing: number) {
  const sample = bearing * resolution / 360
  const index = Math.floor(sample)
  return blend(distances[index], distances[index + 1], sample - index)
}

function distanceAlongCoast(a: number, b: number) {
  const distance = Math.abs(a - b)
  return Math.min(distance, perimeter - distance)
}

function smooth(value: number) {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}

// Keep the dock, ferry apron and the quiet Driftwood–Shellglass shore on their
// surveyed shelves. Fade back into the shaped coast over the next metres.
const protectedShore = [
  { along: coastDistance(231), halfWidth: 13, fade: 9 },
  { along: coastDistance(314), halfWidth: 21, fade: 13 },
]
const landforms = features.map((feature) => ({ ...feature, along: coastDistance(feature.bearing) }))
const bands = noiseBands.map(({ wavelength, amplitude }) => ({ cells: Math.round(perimeter / wavelength), amplitude }))

export function createStarterCoast(seed: number) {
  const offsets = distances.map((along) => {
    let influence = 1
    for (const { along: centre, halfWidth, fade } of protectedShore) {
      influence *= smooth((distanceAlongCoast(along, centre) - halfWidth) / fade)
    }
    let shape = 0
    for (const { along: centre, halfWidth, displacement } of landforms) {
      shape += displacement * smooth(1 - distanceAlongCoast(along, centre) / halfWidth)
    }
    return influence * (shape + fractalNoise1D(along / perimeter, seed, bands))
  })
  return (angle: number) => {
    const sample = wrap(angle / turn, 1) * resolution
    const index = Math.floor(sample)
    const offset = blend(offsets[index], offsets[index + 1], sample - index)
    return baselineScale(angle) + offset / rayLength(angle)
  }
}
