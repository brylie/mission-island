import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { test } from 'node:test'
import { RaycastVehicle } from 'cannon-es'
import { fireWatchGeometry } from '../src/assets/geometry/fire-watch.ts'
import { highwoodHeightmap } from '../src/assets/geometry/highwood-heightmap.ts'
import { createCargoPhysics } from '../src/simulation/cargo.ts'
import { authoredGroundHeight, coastBounds, coastRadius, groundHeight, originalCoastRadius, waterLevel } from '../src/terrain.ts'
import { authoredShare } from '../src/worlds/starter/generation/protection.ts'
import { highwoodGeneration, highwoodPlaces } from '../src/worlds/starter/layout/island-generation.ts'
import { coastlineDimension, shorelineStatistics, slopeShares } from '../src/worlds/starter/generation/island-metrics.ts'
import { bakedHeight } from '../src/worlds/starter/highwood-terrain.ts'
import { bakeSources } from '../src/worlds/starter/generation/bake-sources.ts'

const eyeHeight = 1.6

// The baked grid, read back through the runtime sampler.
function bakedGrid(step = 2) {
  const metres = (nodes) => (nodes - 1) * highwoodHeightmap.cell
  const columns = Math.floor(metres(highwoodHeightmap.columns) / step), rows = Math.floor(metres(highwoodHeightmap.rows) / step)
  const heights = new Float32Array(columns * rows)
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < columns; x++) {
      heights[z * columns + x] = groundHeight({ x: highwoodHeightmap.west + x * step, z: highwoodHeightmap.south + z * step })
    }
  }
  return { columns, rows, cell: step, heights }
}

test('the settled south keeps its authored ground exactly', () => {
  for (const point of [{ x: -40, z: -15 }, { x: 21, z: 36 }, { x: 39, z: 128 }, { x: 61, z: 102 }, { x: -50, z: 72 }, { x: 11, z: 86 }, { x: 31.5, z: -35.6 }]) {
    assert.equal(authoredShare(point, originalCoastRadius(point)), 1, JSON.stringify(point))
    assert.equal(groundHeight(point), authoredGroundHeight(point), JSON.stringify(point))
  }
})

test('the generated island reads like a real coast', () => {
  const grid = bakedGrid()
  const land = (i) => grid.heights[i] >= highwoodGeneration.seaLevel
  const { area, development } = shorelineStatistics(grid, land)
  assert.ok(area > 0.15e6 && area < 0.25e6, `land ${area} m²`)
  assert.ok(development > 1.8, `shoreline development ${development}`)
  assert.ok(coastlineDimension(grid, land) > 1.03, 'a coast rougher than a smooth curve')
  const { steep } = slopeShares(grid, land)
  assert.ok(steep < 0.3, `most land is walkable, steep share ${steep}`)
  const bounds = coastBounds()
  assert.ok(bounds.east - bounds.west > 500 && bounds.north - bounds.south > 600, JSON.stringify(bounds))
})

test('Cairn Summit tops Highwood and Fallow Ridge hides Pine Draw from the tower deck', () => {
  const summit = highwoodPlaces.cairnCrown
  const top = groundHeight(summit)
  assert.ok(top > 40, `summit ${top}`)
  const eye = { ...summit, y: top + fireWatchGeometry.deck.top + eyeHeight }
  const draw = highwoodPlaces.pineDraw
  const floor = groundHeight(draw)
  const blocked = (targetY) => {
    for (let t = 0.05; t < 0.97; t += 0.005) {
      const point = { x: eye.x + (draw.x - eye.x) * t, z: eye.z + (draw.z - eye.z) * t }
      if (groundHeight(point) > eye.y + (targetY - eye.y) * t) return true
    }
    return false
  }
  assert.ok(floor > waterLevel, 'Pine Draw is dry ground')
  assert.equal(blocked(floor + 1), true, 'a ground fire in Pine Draw is out of sight')
  assert.equal(blocked(floor + 32), false, 'its smoke column shows above the ridge')
})

test('generated land meets the old shore without a step', () => {
  // Walk from Juniper Hollow out across the old north-west shore into Highwood.
  let previous = groundHeight({ x: -50, z: 72 })
  for (let t = 0; t <= 1; t += 0.01) {
    const point = { x: -50 - 120 * t, z: 72 + 60 * t }
    const height = groundHeight(point)
    assert.ok(Math.abs(height - previous) < 1.2, `step of ${(height - previous).toFixed(2)} m at ${JSON.stringify(point)}`)
    previous = height
  }
  assert.ok(coastRadius({ x: -170, z: 132 }) < 1, 'the old shore is now inland')
  assert.equal(bakedHeight({ x: 5000, z: 5000 }), highwoodGeneration.seabed)
})

test('wheel raycasts reach the far north of the physics heightfield', () => {
  const contact = new Map()
  const update = RaycastVehicle.prototype.updateVehicle
  RaycastVehicle.prototype.updateVehicle = function (...args) {
    const result = update.apply(this, args)
    contact.set(this.chassisBody.id, this.numWheelsOnGround)
    return result
  }
  try {
    const physics = createCargoPhysics()
    const at = highwoodPlaces.pineDraw
    let truck = physics.parkTruck({ ...at, heading: 0 })
    for (let i = 0; i < 30; i++) truck = physics.step([], truck, { x: 0, z: 0 }, 1 / 30)
    assert.equal(Math.max(...contact.values()), 4)
  }
  finally {
    RaycastVehicle.prototype.updateVehicle = update
  }
})

test('the baked terrain is up to date with its generator and the authored island', () => {
  const hash = createHash('sha256')
  for (const path of bakeSources) hash.update(path).update(readFileSync(new URL(`../${path}`, import.meta.url)))
  assert.equal(highwoodHeightmap.sourceHash, hash.digest('hex'), 'run npm run island:generate and commit the new bake')
})

test('beyond the seam, the ground is the baked terrain', () => {
  const { west, south, cell, columns, rows } = highwoodHeightmap
  let checked = 0
  for (let z = 0; z < rows; z += 7) {
    for (let x = 0; x < columns; x += 7) {
      const point = { x: west + x * cell, z: south + z * cell }
      const keep = authoredShare(point, originalCoastRadius(point))
      if (keep <= 0 || keep >= 0.9) continue
      checked++
      assert.ok(Math.abs(groundHeight(point) - Math.max(bakedHeight(point), highwoodGeneration.seabed)) < 0.01, JSON.stringify(point))
    }
  }
  assert.ok(checked > 20, `checked ${checked} join-band nodes`)
})

test('the shipped terrain drains: no closed hollow holds water inland', () => {
  // Steepest descent from a grid of Highwood land points must reach the sea or a flat spill.
  const { west, south, cell, columns, rows } = highwoodHeightmap
  let stuck = 0, traced = 0
  for (let z = 4; z < rows - 4; z += 9) {
    for (let x = 4; x < columns - 4; x += 9) {
      let point = { x: west + x * cell, z: south + z * cell }
      if (groundHeight(point) < waterLevel + 0.5 || authoredShare(point, originalCoastRadius(point)) > 0) continue
      traced++
      for (let step = 0; step < 600; step++) {
        const here = groundHeight(point)
        let best = point, lowest = here
        for (let a = 0; a < 8; a++) {
          const next = { x: point.x + Math.cos(a * Math.PI / 4) * cell, z: point.z + Math.sin(a * Math.PI / 4) * cell }
          const h = groundHeight(next)
          if (h < lowest) [best, lowest] = [next, h]
        }
        if (lowest < waterLevel) break
        // A pit deeper than a few centimetres would hold a pond the ocean plane can't fill.
        if (best === point) {
          if (here - waterLevel > 0.3) stuck++
          break
        }
        point = best
      }
    }
  }
  assert.ok(traced > 100, `traced ${traced}`)
  assert.ok(stuck / traced < 0.05, `${stuck} of ${traced} traces stopped in a hollow`)
})
