import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groundHeight, originalCoastRadius, waterLevel } from '../src/terrain.ts'
import { authoredShare } from '../src/worlds/starter/generation/protection.ts'
import { dominantHabitat, highwoodHabitatAt } from '../src/worlds/starter/highwood-habitat.ts'
import { highwoodHabitatIds } from '../src/worlds/starter/layout/highwood-habitats.ts'
import { highwoodPlaces } from '../src/worlds/starter/layout/island-generation.ts'

const sampleStepM = 8
const landMarginM = 0.2

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
