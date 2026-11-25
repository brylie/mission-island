import assert from 'node:assert/strict'
import { test } from 'node:test'
import { standingPlants } from '../src/highwood-standing.ts'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import { plantMatrix, plantNormalMatrix } from '../src/plant-matrix.ts'
import { plantBaseRadius, plantSeat, tallShrub } from '../src/plant-seat.ts'
import { highwoodForestLook as look } from '../src/assets/recipes/highwood-forest.ts'
import { groundHeight } from '../src/terrain.ts'

// Every Highwood plant's base, as drawn (sunk by `sinkM`), meets the ground on its downhill side
// (#263). Sampled between the directions the seat itself looks in, so the test doesn't only check
// what the seat measured.
const probes = 32
const gapM = 0
// The bake stores plants' positions in steps, so a shrub is drawn a little off where it was judged.
const quantizedM = 0.02
const minTestedSlope = 0.3
const shrubsTested = 20
const closeM = 1e-3

test('no Highwood plant\'s base hangs above the ground, and no tall shrub is buried in its hill', () => {
  const worst = { gap: { by: -Infinity, at: '' }, bury: { by: -Infinity, at: '' } }
  let seated = 0
  for (const plant of standingPlants()) {
    const radius = plantBaseRadius(plant)
    if (radius <= 0) continue
    seated++
    const { y, slope } = plantSeat(plant)
    for (let k = 0; k < probes; k++) {
      const angle = (k + 0.5) * Math.PI * 2 / probes
      const dx = Math.cos(angle) * radius, dz = Math.sin(angle) * radius
      const base = y + dx * slope.x + dz * slope.z
      const ground = groundHeight({ x: plant.x + dx, z: plant.z + dz })
      const label = `${plant.species} at (${plant.x.toFixed(1)}, ${plant.z.toFixed(1)})`
      if (base - ground > worst.gap.by) worst.gap = { by: base - ground, at: label }
      const over = ground - base - (tallShrub(plant) ? look.seat.shrubBuryM : Infinity)
      if (over > worst.bury.by) worst.bury = { by: over, at: label }
    }
  }
  assert.ok(seated > 1000, `seated ${seated} plants`)
  assert.ok(worst.gap.by <= gapM, `a ${worst.gap.at} stands ${worst.gap.by.toFixed(2)} m above the ground`)
  assert.ok(worst.bury.by <= quantizedM, `a ${worst.bury.at} is buried ${worst.bury.by.toFixed(2)} m deeper than it may be on its uphill side`)
})

test('a sheared shrub\'s matrix puts its base on its slope and tilts its upward normals with it', () => {
  const sheared = standingPlants().filter((plant) => {
    const { slope } = plantSeat(plant)
    return Math.hypot(slope.x, slope.z) > minTestedSlope
  }).slice(0, shrubsTested)
  assert.ok(sheared.length === shrubsTested, `found ${sheared.length} sheared shrubs`)
  for (const plant of sheared) {
    const { y, slope } = plantSeat(plant)
    const matrix = plantMatrix(plant)
    for (const [x, z] of [[1, 0], [0, 1], [-1, 1]]) {
      const world = Vector3.TransformCoordinates(new Vector3(x, 0, z), matrix)
      const onPlane = y + (world.x - plant.x) * slope.x + (world.z - plant.z) * slope.z
      assert.ok(Math.abs(world.y - onPlane) < closeM, `${plant.species}'s base point stands ${(world.y - onPlane).toFixed(3)} m off its slope`)
    }
    const up = Vector3.TransformNormal(Vector3.Up(), plantNormalMatrix(plant)).normalize()
    const expected = new Vector3(-slope.x, 1, -slope.z).normalize()
    assert.ok(Vector3.Dot(up, expected) > 1 - closeM, `${plant.species}'s upward normal doesn't follow its slope`)
  }
})
