import { plantingLayers, type Planting, type PlantingLayer } from '../highwood-planting.ts'
import { fbm } from '../../../math/gradient-noise.ts'
import { seededRandom } from '../../../seeded-random.ts'
import { groundHeight, originalCoastRadius, waterLevel } from '../../../terrain.ts'
import { clearOfEarthworks, clearOfRoutes, coverCanGrow, sightlineAlong } from '../highwood-clearings.ts'
import type { Point } from '../../../world.ts'
import { authoredShare } from './protection.ts'
import { highwoodExposure, highwoodHabitatAt, type HighwoodHabitat } from '../highwood-habitat.ts'
import { bakedSurface } from '../highwood-terrain.ts'
import { highwoodAuthoredLimit, highwoodSightlineEyeClearM, highwoodClumping, highwoodExposedAbove, highwoodLeanJitter, highwoodLogLie, highwoodMaximumCover, highwoodPlantingLayers, highwoodPlantingLimits, highwoodPlantingSeed, highwoodRouteClearanceM, highwoodScaleSpread, highwoodTemplateVariants } from '../layout/highwood-planting.ts'
import { highwoodGeneration } from '../layout/island-generation.ts'
import { ridgeWind } from '../ridge-scout.ts'

// Plants Highwood: every tree, shrub and piece of deadwood, from the habitat
// classifier and the stand tables. scripts/plant-highwood.mjs runs it and bakes
// the result, so the game decodes a list instead of classifying at load.

const landMarginM = 0.3
const half = 0.5
const noiseRange = 0.7
const fullTurn = Math.PI + Math.PI
const slopeSpanM = 1
// Exposed forms lean toward +x; this heading turns +x to point the way the wind blows.
const downwind = Math.atan2(ridgeWind.x, ridgeWind.z) - Math.PI * half

function pick<T extends string>(random: () => number, weights: Partial<Record<T, number>>) {
  const entries = Object.entries(weights) as [T, number][]
  let roll = random() * entries.reduce((sum, [, weight]) => sum + weight, 0)
  for (const [id, weight] of entries) if ((roll -= weight) < 0) return id
  return entries[entries.length - 1][0]
}

function slope({ x, z }: Point) {
  const dx = groundHeight({ x: x + slopeSpanM, z }) - groundHeight({ x: x - slopeSpanM, z })
  const dz = groundHeight({ x, z: z + slopeSpanM }) - groundHeight({ x, z: z - slopeSpanM })
  return Math.hypot(dx, dz) / (slopeSpanM + slopeSpanM)
}

// Cheap checks first: most cells in the grid are sea or the authored south.
function onHighwoodLand(point: Point) {
  return groundHeight(point) > waterLevel + landMarginM && authoredShare(point, originalCoastRadius(point)) < highwoodAuthoredLimit
    && bakedSurface(point).sand <= highwoodPlantingLimits.sand
}

function clearForPlant(point: Point, layer: PlantingLayer, habitat: HighwoodHabitat) {
  if (layer !== 'understory' && slope(point) > highwoodPlantingLimits.treeSlope) return false
  // Nothing stands in a corridor right by the viewpoint. Further along, low plants may, and so
  // may a creek bank's alders and willows.
  const along = sightlineAlong(point)
  if (along !== undefined && along <= highwoodSightlineEyeClearM) return false
  if (along !== undefined && layer !== 'understory' && !(habitat === 'wet' && layer === 'canopy')) return false
  if (!(layer === 'understory' ? coverCanGrow(point) : clearOfEarthworks(point))) return false
  return clearOfRoutes(point, highwoodRouteClearanceM)
}

// How much a clump raises or lowers a layer's cover at a point, as a multiplier.
function clumpCover(layer: PlantingLayer, point: Point) {
  const clumping = layer === 'deadwood' ? undefined : highwoodClumping[layer]
  if (!clumping) return 1
  const patch = fbm(point.x, point.z, highwoodClumping.seed + plantingLayers.indexOf(layer), clumping) / noiseRange
  return Math.max(0, 1 + clumping.strength * patch)
}

function scaleSpread(layer: PlantingLayer) {
  return layer === 'deadwood' ? highwoodScaleSpread : highwoodClumping[layer].scaleSpread
}

// The heading that lays a log (along its template's +x) across the slope at a point,
// or undefined where the ground along it rises or falls too far.
function logHeading(point: Point, roll: number, scale: number) {
  const dx = groundHeight({ x: point.x + slopeSpanM, z: point.z }) - groundHeight({ x: point.x - slopeSpanM, z: point.z })
  const dz = groundHeight({ x: point.x, z: point.z + slopeSpanM }) - groundHeight({ x: point.x, z: point.z - slopeSpanM })
  // Along the contour, either way; on flat ground any way.
  const flat = Math.hypot(dx, dz) === 0
  // A log runs along (cos h, -sin h); across the gradient (dx, dz) that is (-dz, dx).
  const along = flat ? roll * fullTurn : Math.atan2(-dx, -dz) + (roll < half ? 0 : Math.PI)
  const direction = { x: Math.cos(along), z: -Math.sin(along) }
  // The log tilts to the ground at its far end; reject ground that bulges or dips away from that line.
  const root = groundHeight(point)
  // Check the whole length the scaled log will lie along.
  const { samples, reliefM } = highwoodLogLie
  const lengthM = highwoodLogLie.lengthM * scale
  const end = groundHeight({ x: point.x + direction.x * lengthM, z: point.z + direction.z * lengthM })
  for (let i = 1; i < samples; i++) {
    const share = i / samples
    const at = { x: point.x + direction.x * lengthM * share, z: point.z + direction.z * lengthM * share }
    if (Math.abs(groundHeight(at) - (root + (end - root) * share)) > reliefM) return
  }
  return along
}

function plantLayer(layer: PlantingLayer, out: Planting[]) {
  const { cellM, stands } = highwoodPlantingLayers[layer]
  const { west, south, cell, columns, rows } = highwoodGeneration.grid
  const random = seededRandom(highwoodPlantingSeed * (plantingLayers.indexOf(layer) + 1))
  for (let z = south; z < south + rows * cell; z += cellM) {
    for (let x = west; x < west + columns * cell; x += cellM) {
      // Draw every roll for every cell, so a change in one place never reshuffles the rest.
      const rolls = { x: random(), z: random(), habitat: random(), cover: random(), species: random(), age: random(), variant: random(), heading: random(), scale: random() }
      const point = { x: x + rolls.x * cellM, z: z + rolls.z * cellM }
      if (!onHighwoodLand(point)) continue
      const habitat = pick<HighwoodHabitat>(() => rolls.habitat, highwoodHabitatAt(point))
      const stand = stands[habitat]
      if (rolls.cover >= Math.min(highwoodMaximumCover, stand.cover * clumpCover(layer, point)) || !stand.mix.length || !clearForPlant(point, layer, habitat)) continue
      const choice = stand.mix[Number(pick(() => rolls.species, Object.fromEntries(stand.mix.map((entry, index) => [index, entry.weight]))))]
      const exposed = highwoodExposure(point) > highwoodExposedAbove
      const scale = 1 + (rolls.scale - half) * (scaleSpread(layer) + scaleSpread(layer))
      const lying = choice.species === highwoodLogLie.species ? logHeading(point, rolls.heading, scale) : undefined
      if (choice.species === highwoodLogLie.species && lying === undefined) continue
      out.push({
        ...point,
        layer,
        species: choice.species,
        age: pick<Planting['age']>(() => rolls.age, choice.ages),
        exposure: exposed ? 'exposed' : 'sheltered',
        variant: Math.floor(rolls.variant * highwoodTemplateVariants),
        heading: lying ?? (exposed ? downwind + (rolls.heading - half) * (highwoodLeanJitter + highwoodLeanJitter) : rolls.heading * fullTurn),
        scale,
      })
    }
  }
}

// How much of each ground layer covers a point, from its habitat weights:
// needle litter under pine, heather on heath and the exposed ridge, moss in wet
// woodland, bracken on its slopes. Sea and the authored south carry none.
export function groundCoverAt(point: Point) {
  if (!onHighwoodLand(point)) return { litter: 0, heath: 0, moss: 0, bracken: 0 }
  const habitat = highwoodHabitatAt(point)
  return {
    litter: Math.min(1, habitat.pinewood + habitat.edge * half + habitat.birch * half),
    heath: Math.min(1, habitat.heath + habitat.ridge),
    moss: habitat.wet,
    bracken: habitat.bracken,
  }
}

export function plantHighwood(): Planting[] {
  const out: Planting[] = []
  for (const layer of plantingLayers) plantLayer(layer, out)
  return out
}
