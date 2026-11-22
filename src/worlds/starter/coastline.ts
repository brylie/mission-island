import { blend, clamp, fractalNoise1D, wrap } from '../../math/noise.ts'
import { island } from '../../world.ts'
import { coastlineLayout } from './layout/terrain.ts'

export { starterCoastSeed } from './layout/terrain.ts'

const halves = 2
const northStretchExponent = 2
const turn = halves * Math.PI
const degreesPerTurn = 360
const resolution = 4096
const step = turn / resolution
const smoothstepQuadraticWeight = 3
const smoothstepCubicWeight = 2

function baselineScale(angle: number) {
  const northern = Math.max(0, Math.sin(angle))
  const { northStretch, swells, ripples } = coastlineLayout
  return (1 + northStretch * northern ** northStretchExponent)
    * (1 + Math.sin(angle * swells.frequency + swells.phase) * swells.amplitude + Math.cos(angle * ripples.frequency) * ripples.amplitude)
}

function rayLength(angle: number) {
  return Math.hypot(Math.cos(angle) * island.width / halves, Math.sin(angle) * island.length / halves)
}

const distances = [0]
let previous = { x: island.width / halves * baselineScale(0), z: 0 }
for (let i = 1; i <= resolution; i++) {
  const angle = i * step
  const scale = baselineScale(angle)
  const point = { x: Math.cos(angle) * island.width / halves * scale, z: Math.sin(angle) * island.length / halves * scale }
  distances.push(distances[i - 1] + Math.hypot(point.x - previous.x, point.z - previous.z))
  previous = point
}
const perimeter = distances[resolution]

function coastDistance(bearing: number) {
  const sample = bearing * resolution / degreesPerTurn
  const index = Math.floor(sample)
  return blend(distances[index], distances[index + 1], sample - index)
}

function distanceAlongCoast(a: number, b: number) {
  const distance = Math.abs(a - b)
  return Math.min(distance, perimeter - distance)
}

function smooth(value: number) {
  const t = clamp(value)
  return t * t * (smoothstepQuadraticWeight - smoothstepCubicWeight * t)
}

// Keep the dock, ferry apron and the quiet Driftwood–Shellglass shore on their
// surveyed shelves. Fade back into the shaped coast over the next metres.
const protectedShore = coastlineLayout.protectedShelves.map(({ bearing, halfWidth, fade }) => ({ along: coastDistance(bearing), halfWidth, fade }))
const landforms = coastlineLayout.landforms.map((feature) => ({ ...feature, along: coastDistance(feature.bearing) }))
const bands = coastlineLayout.noiseBands.map(({ wavelength, amplitude }) => ({ cells: Math.round(perimeter / wavelength), amplitude }))

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
