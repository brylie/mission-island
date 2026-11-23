import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { URL } from 'node:url'
import { treeSpecies } from '../src/assets/trees/tree-catalog.ts'
import { highwoodSolidTop } from '../src/highwood-solids.ts'
import { propTop } from '../src/scenery.ts'
import { groundHeight, originalCoastRadius, waterLevel } from '../src/terrain.ts'
import { authoredShare } from '../src/worlds/starter/generation/protection.ts'
import { highwoodPlants } from '../src/assets/geometry/highwood-plants.ts'
import { plantingSources } from '../src/worlds/starter/generation/bake-sources.ts'
import { plantHighwood } from '../src/worlds/starter/generation/plant-highwood.ts'
import { dominantHabitat, highwoodHabitatAt } from '../src/worlds/starter/highwood-habitat.ts'
import { highwoodGroundCover, highwoodPlanting } from '../src/worlds/starter/highwood-planting.ts'
import { groundSurface } from '../src/audio/surface.ts'
import { highwoodHabitatIds } from '../src/worlds/starter/layout/highwood-habitats.ts'
import { highwoodPlaces } from '../src/worlds/starter/layout/island-generation.ts'

const sampleStepM = 8
const landMarginM = 0.2
const positionToleranceM = 0.02
const minimumCanopy = 1000
const half = 2
const walkerPaddingM = 0.35
const coverShare = 0.6
const litterFootsteps = 0.6
const standingHeightM = 2

function highwoodShares() {
  const counts = Object.fromEntries(highwoodHabitatIds.map((id) => [id, 0]))
  let total = 0
  for (let z = -20; z <= 560; z += sampleStepM) {
    for (let x = -560; x <= 120; x += sampleStepM) {
      const point = { x, z }
      if (groundHeight(point) <= waterLevel + landMarginM || authoredShare(point, originalCoastRadius(point)) >= 1) continue
      counts[dominantHabitat(highwoodHabitatAt(point))]++
      total++
    }
  }
  return Object.fromEntries(Object.entries(counts).map(([id, count]) => [id, count / total]))
}

test('Highwood habitat weights are deterministic and sum to one', () => {
  for (const point of [highwoodPlaces.cairnCrown, highwoodPlaces.birchFlats, highwoodPlaces.pineDraw, { x: -300, z: 312 }]) {
    const weights = highwoodHabitatAt(point)
    assert.deepEqual(highwoodHabitatAt(point), weights)
    const sum = Object.values(weights).reduce((a, b) => a + b, 0)
    assert.ok(Math.abs(sum - 1) < 1e-9, `weights at ${point.x}, ${point.z} sum to ${sum}`)
    assert.ok(Object.values(weights).every((weight) => weight >= 0))
  }
})

test('Highwood reads as a pinewood mosaic with its named stands in place', () => {
  const shares = highwoodShares()
  // Pinewood is the matrix; every other habitat is a patch within it.
  for (const id of highwoodHabitatIds) if (id !== 'pinewood') assert.ok(shares.pinewood > shares[id], `${id} covers ${shares[id].toFixed(2)}, pinewood ${shares.pinewood.toFixed(2)}`)
  for (const id of ['wet', 'birch', 'bracken', 'edge', 'heath']) assert.ok(shares[id] > 0.02, `${id} covers only ${shares[id].toFixed(3)}`)
  assert.equal(dominantHabitat(highwoodHabitatAt(highwoodPlaces.cairnCrown)), 'ridge')
  assert.equal(dominantHabitat(highwoodHabitatAt(highwoodPlaces.birchFlats)), 'birch')
})

test('the baked planting is up to date and decodes to the placer\'s plants', () => {
  const hash = createHash('sha256')
  for (const path of plantingSources) hash.update(path).update(readFileSync(new URL(`../${path}`, import.meta.url)))
  assert.equal(highwoodPlants.sourceHash, hash.digest('hex'), 'run npm run island:generate and commit the new bake')
  const placed = plantHighwood()
  const baked = highwoodPlanting()
  assert.equal(baked.length, placed.length)
  for (let i = 0; i < placed.length; i += 37) {
    const [a, b] = [placed[i], baked[i]]
    assert.deepEqual([b.layer, b.species, b.age, b.exposure, b.variant], [a.layer, a.species, a.age, a.exposure, a.variant])
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < positionToleranceM, `plant ${i} moved in the bake`)
  }
})

test('Highwood plants keep to land, come from the catalog and are mostly pine', () => {
  const plants = highwoodPlanting()
  assert.ok(plants.every((plant) => groundHeight(plant) > waterLevel))
  assert.ok(plants.every((plant) => plant.species in treeSpecies), 'every planted species is in the tree catalog')
  const canopy = plants.filter((plant) => plant.layer === 'canopy')
  assert.ok(canopy.length > minimumCanopy, `only ${canopy.length} canopy trees`)
  assert.ok(canopy.filter((plant) => plant.species === 'scots-pine').length > canopy.length / half, 'Scots pine should be most of the canopy')
})

test('Highwood trunks block walking and soft plants do not', () => {
  const plants = highwoodPlanting()
  const pine = plants.find((plant) => plant.layer === 'canopy' && plant.species === 'scots-pine' && plant.age === 'mature')
  assert.ok(highwoodSolidTop(pine, walkerPaddingM) > groundHeight(pine) + standingHeightM, 'a mature pine stands taller than a walker')
  const bracken = plants.find((plant) => plant.species === 'bracken' && highwoodSolidTop(plant, 0) === -Infinity)
  assert.ok(bracken, 'bracken is soft cover')
  assert.equal(propTop(pine, walkerPaddingM), highwoodSolidTop(pine, walkerPaddingM))
})

test('Highwood ground cover follows the habitats and sounds like litter under pine', () => {
  const pines = highwoodPlanting().filter((plant) => plant.layer === 'canopy' && plant.species === 'scots-pine')
  const underPine = pines.filter((plant) => highwoodGroundCover(plant).litter > half / (half + half)).length
  assert.ok(underPine > pines.length * coverShare, `only ${underPine} of ${pines.length} pines stand on needle litter`)
  const pine = pines.find((plant) => highwoodGroundCover(plant).litter > litterFootsteps)
  assert.equal(groundSurface(pine), 'litter')
  assert.deepEqual(highwoodGroundCover({ x: 0, z: 0 }), { litter: 0, heath: 0, moss: 0, bracken: 0 }, 'the authored south has no Highwood cover')
})
