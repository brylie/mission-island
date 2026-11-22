import { blend, clamp, fractalNoise1D, wrap } from '../../math/noise.ts'
import { island } from '../../world.ts'
import { beachWidthLayout, coastlineLayout } from './layout/terrain.ts'

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
function periodicBands(bands: readonly { wavelength: number, amplitude: number }[]) {
  return bands.map(({ wavelength, amplitude }) => ({ cells: Math.round(perimeter / wavelength), amplitude }))
}

const coastBands = periodicBands(coastlineLayout.noiseBands)
const beachBands = periodicBands(beachWidthLayout.noiseBands)
const openShore = distances.map((along) => {
  let influence = 1
  for (const { along: centre, halfWidth, fade } of protectedShore) {
    influence *= smooth((distanceAlongCoast(along, centre) - halfWidth) / fade)
  }
  return influence
})
const landformOffsets = distances.map((along) => {
  let offset = 0
  for (const { along: centre, halfWidth, displacement } of landforms) {
    offset += displacement * smooth(1 - distanceAlongCoast(along, centre) / halfWidth)
  }
  return offset
})

function coastSample(angle: number) {
  return wrap(angle / turn, 1) * resolution
}

function interpolate(values: readonly number[], sample: number) {
  const index = Math.floor(sample)
  return blend(values[index], values[index + 1], sample - index)
}

export function createStarterCoast(seed: number) {
  const offsets = distances.map((along, i) =>
    openShore[i] * (landformOffsets[i] + fractalNoise1D(along / perimeter, seed, coastBands)))
  return (angle: number) => baselineScale(angle) + interpolate(offsets, coastSample(angle)) / rayLength(angle)
}

export function createStarterBeachWidth(seed: number) {
  const { meanM, minM, maxM, landformInfluence } = beachWidthLayout
  const widths = distances.map((along, i) => {
    const change = fractalNoise1D(along / perimeter, seed, beachBands)
    // The signed landforms identify projecting points and sheltered indentations.
    return Math.min(maxM, Math.max(minM, meanM + change - landformOffsets[i] * landformInfluence))
  })
  // The dock and the hand-shaped Driftwood coast use their surveyed margins.
  return (angle: number, surveyedWidthM: number) => {
    const sample = coastSample(angle)
    return blend(surveyedWidthM, interpolate(widths, sample), interpolate(openShore, sample))
  }
}
