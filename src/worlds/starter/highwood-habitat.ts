import { fbm } from '../../math/gradient-noise.ts'
import { smoothstep } from '../../math/smoothstep.ts'
import type { Point } from '../../world.ts'
import { bakedHeight, bakedShoreMetres, bakedSurface } from './highwood-terrain.ts'
import { highwoodHabitatIds, highwoodHabitatNoise as noise, highwoodHabitatRules as rules, highwoodHabitatSlopeSpanM as span } from './layout/highwood-habitats.ts'
import { highwoodPlaces } from './layout/island-generation.ts'
import { ridgeWind } from './ridge-scout.ts'

// Highwood's habitat at a point, from the baked ground: soil water, height,
// slope, bare rock and wind exposure decide what grows, as they do in a real
// pinewood (docs/field-guide/highwood-habitats.md). Each habitat gets a weight
// from 0 to 1 and the weights sum to 1, so stands blend at their edges. The
// host and every screen call this with the same bake, so they agree.

export type HighwoodHabitat = typeof highwoodHabitatIds[number]
export type HabitatWeights = Record<HighwoodHabitat, number>

const noiseRange = 0.7
const half = 0.5
const brackenSeed = 1
const birchSeed = 2
const gapSeed = 3
const crestDirections = 8
const fullTurn = Math.PI + Math.PI
const windLength = Math.hypot(ridgeWind.x, ridgeWind.z)
const wind = { x: ridgeWind.x / windLength, z: ridgeWind.z / windLength }

const rise = (value: number, [start, full]: readonly [number, number]) => smoothstep((value - start) / (full - start))
// A patch value from 0 to 1 that varies smoothly across the ground.
const patch = (point: Point, seed: number, octaves: Parameters<typeof fbm>[3]) => half + half * fbm(point.x, point.z, noise.seed + seed, octaves) / noiseRange

function gradient(point: Point) {
  const dx = (bakedHeight({ x: point.x + span, z: point.z }) - bakedHeight({ x: point.x - span, z: point.z })) / (span + span)
  const dz = (bakedHeight({ x: point.x, z: point.z + span }) - bakedHeight({ x: point.x, z: point.z - span })) / (span + span)
  return { dx, dz, slope: Math.hypot(dx, dz) }
}

// The wettest ground within a bank's width, so a creek's banks read as wet woodland.
function wetness(point: Point) {
  let wettest = bakedSurface(point).moisture
  for (let i = 0; i < crestDirections; i++) {
    const angle = i * fullTurn / crestDirections
    wettest = Math.max(wettest, bakedSurface({ x: point.x + Math.cos(angle) * rules.wet.bankM, z: point.z + Math.sin(angle) * rules.wet.bankM }).moisture)
  }
  return wettest
}

// How far a point stands above the ground around it: crests and knolls catch the wind.
function crest(point: Point, height: number) {
  let around = 0
  for (let i = 0; i < crestDirections; i++) {
    const angle = i * fullTurn / crestDirections
    around += bakedHeight({ x: point.x + Math.cos(angle) * rules.exposure.crestRadiusM, z: point.z + Math.sin(angle) * rules.exposure.crestRadiusM })
  }
  return height - around / crestDirections
}

// Wind exposure from 0 (sheltered) to 1: high ground, slopes facing into the prevailing wind, and crests.
export function highwoodExposure(point: Point) {
  const height = bakedHeight(point)
  const { dx, dz, slope } = gradient(point)
  // Ground that rises along the wind's direction faces into it.
  const windward = slope > 0 ? (dx * wind.x + dz * wind.z) : 0
  const { exposure } = rules
  const lift = rise(height, exposure.height)
  const facing = rise(windward, exposure.windward)
  const top = rise(crest(point, height), exposure.crest)
  return Math.min(1, lift * (1 - exposure.windwardShare - exposure.crestShare) + facing * exposure.windwardShare + top * exposure.crestShare + lift * top * exposure.crestShare)
}

export function highwoodHabitatAt(point: Point): HabitatWeights {
  const height = bakedHeight(point)
  const { rock } = bakedSurface(point)
  const { slope } = gradient(point)
  const exposure = highwoodExposure(point)
  // Each habitat claims a share of what the ones before it left.
  let left = 1
  const claim = (amount: number) => {
    const taken = left * Math.max(0, Math.min(1, amount))
    left -= taken
    return taken
  }
  const shore = claim(1 - rise(bakedShoreMetres(point), rules.shore.inland))
  const wet = claim(rise(wetness(point), rules.wet.moisture) * (1 - rise(height, rules.wet.highest)))
  const ridge = claim(Math.max(rise(exposure, rules.ridge.exposure), rise(rock, rules.ridge.rock)))
  const heath = claim(Math.max(rise(exposure, rules.heath.exposure), rise(rock, rules.heath.rock)))
  const gentle = rise(slope, rules.bracken.slope) * (1 - rise(slope, rules.bracken.steepest))
  const bracken = claim(gentle * rise(patch(point, brackenSeed, noise.bracken), rules.bracken.patch))
  const grove = Math.max(0, 1 - Math.hypot(point.x - highwoodPlaces.birchFlats.x, point.z - highwoodPlaces.birchFlats.z) / rules.birch.placeRadiusM) * rules.birch.placeShare
  const birch = claim(Math.min(1, grove + rise(patch(point, birchSeed, noise.birch), rules.birch.patch)))
  const edge = claim(rise(patch(point, gapSeed, noise.gaps), rules.gaps.patch))
  return { pinewood: left, edge, heath, ridge, wet, bracken, birch, shore }
}

export function dominantHabitat(weights: HabitatWeights) {
  let best: HighwoodHabitat = 'pinewood'
  for (const id of highwoodHabitatIds) if (weights[id] > weights[best]) best = id
  return best
}
