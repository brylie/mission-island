import { plantingLayers, type Planting, type PlantingLayer } from '../highwood-planting.ts'
import { distanceToRoute, footpaths, roads, walkways } from '../../../routes.ts'
import { seededRandom } from '../../../seeded-random.ts'
import { groundHeight, originalCoastRadius, waterLevel } from '../../../terrain.ts'
import type { Point } from '../../../world.ts'
import { authoredShare } from './protection.ts'
import { highwoodExposure, highwoodHabitatAt, type HighwoodHabitat } from '../highwood-habitat.ts'
import { bakedSurface } from '../highwood-terrain.ts'
import { highwoodExposedAbove, highwoodPlantingLayers, highwoodSightlines, highwoodPlantingLimits, highwoodPlantingSeed, highwoodRouteClearanceM, highwoodScaleSpread, highwoodTemplateVariants } from '../layout/highwood-planting.ts'
import { highwoodGeneration } from '../layout/island-generation.ts'
import { ridgeWind } from '../ridge-scout.ts'

// Plants Highwood: every tree, shrub and piece of deadwood, from the habitat
// classifier and the stand tables. scripts/plant-highwood.mjs runs it and bakes
// the result, so the game decodes a list instead of classifying at load.

const landMarginM = 0.3
const half = 0.5
const fullTurn = Math.PI + Math.PI
const slopeSpanM = 1
// Exposed forms lean toward +x; this heading turns +x to point the way the wind blows.
const downwind = Math.atan2(ridgeWind.x, ridgeWind.z) - Math.PI * half
const routes = [...footpaths.map(({ points }) => points), ...walkways.map(({ points }) => points), ...roads]

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
  return groundHeight(point) > waterLevel + landMarginM && authoredShare(point, originalCoastRadius(point)) < 1
    && bakedSurface(point).sand <= highwoodPlantingLimits.sand
}

// Whether a point falls in a kept-open sight line's corridor.
export function inSightline(point: Point) {
  return highwoodSightlines.some(({ eye, look, reachM, halfWidthM, spread }) => {
    const dx = look.x - eye.x, dz = look.z - eye.z
    const length = Math.hypot(dx, dz)
    const along = ((point.x - eye.x) * dx + (point.z - eye.z) * dz) / length
    if (along < 0 || along > reachM) return false
    const across = Math.abs((point.x - eye.x) * dz - (point.z - eye.z) * dx) / length
    return across < halfWidthM + along * spread
  })
}

function clearOfRoutes(point: Point, layer: PlantingLayer) {
  if (layer !== 'understory' && (slope(point) > highwoodPlantingLimits.treeSlope || inSightline(point))) return false
  return routes.every((route) => distanceToRoute(point, route) > highwoodRouteClearanceM)
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
      if (rolls.cover >= stand.cover || !stand.mix.length || !clearOfRoutes(point, layer)) continue
      const choice = stand.mix[Number(pick(() => rolls.species, Object.fromEntries(stand.mix.map((entry, index) => [index, entry.weight]))))]
      const exposed = highwoodExposure(point) > highwoodExposedAbove
      out.push({
        ...point,
        layer,
        species: choice.species,
        age: pick<Planting['age']>(() => rolls.age, choice.ages),
        exposure: exposed ? 'exposed' : 'sheltered',
        variant: Math.floor(rolls.variant * highwoodTemplateVariants),
        heading: exposed ? downwind : rolls.heading * fullTurn,
        scale: 1 + (rolls.scale - half) * (highwoodScaleSpread + highwoodScaleSpread),
      })
    }
  }
}

export function plantHighwood(): Planting[] {
  const out: Planting[] = []
  for (const layer of plantingLayers) plantLayer(layer, out)
  return out
}
