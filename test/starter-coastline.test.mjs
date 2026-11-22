import assert from 'node:assert/strict'
import test from 'node:test'
import { sandpiperPose } from '../src/sandpiper-motion.ts'
import { boundaryBuoys, buoyBoundaryPoint, coastPoint, coastRadius, coastalSurface, groundHeight, waterLevel, withinSkiffBoundary } from '../src/terrain.ts'
import { createStarterCoast, starterCoastSeed } from '../src/worlds/starter/coastline.ts'
import { onBeachTowel } from '../src/worlds/starter/sites.ts'
import { driftwoodSandpipers } from '../src/worlds/starter/layout/wildlife.ts'

test('the seeded coast closes smoothly and preserves the silhouettes of its site shelves', () => {
  const coast = createStarterCoast(starterCoastSeed)
  const replay = createStarterCoast(starterCoastSeed)
  const alternate = createStarterCoast(starterCoastSeed + 1)
  const turn = 2 * Math.PI
  const samples = Array.from({ length: 720 }, (_, i) => i * turn / 720)
  assert.deepEqual(samples.map(coast), samples.map(replay))
  assert.ok(samples.some((angle) => Math.abs(coast(angle) - alternate(angle)) > 0.025))
  for (const bearing of [231, 314]) {
    const angle = bearing * Math.PI / 180
    assert.equal(coast(angle), alternate(angle))
  }
  for (const angle of samples) {
    assert.ok(Math.abs(coast(angle) - coast(angle + turn)) < 1e-12)
    assert.ok(Math.abs(coast(angle - 1e-5) - coast(angle + 1e-5)) < 0.001)
    assert.ok(Math.abs(coastRadius(coastPoint(angle)) - 1) < 1e-12)
  }
})

test('landform waterlines and visible buoys agree with terrain and navigation', () => {
  for (const bearing of [43, 70, 142, 210, 248, 275, 300]) {
    const angle = bearing * Math.PI / 180
    assert.ok(Math.abs(groundHeight(coastPoint(angle)) - waterLevel) < 1e-10)
    assert.ok(groundHeight(coastPoint(angle, 0.996)) > waterLevel)
    assert.ok(groundHeight(coastPoint(angle, 1.004)) < waterLevel)
  }
  for (const [i, buoy] of boundaryBuoys.entries()) {
    assert.deepEqual(buoy, buoyBoundaryPoint(i * Math.PI / 12))
    assert.ok(withinSkiffBoundary({ x: buoy.x * 0.999, z: buoy.z * 0.999 }))
    assert.ok(!withinSkiffBoundary({ x: buoy.x * 1.001, z: buoy.z * 1.001 }))
  }
})

test('Driftwood has a broad sand shelf, inland vegetated dunes and a rock pinch at Splitstone', () => {
  const driftwood = 5.2
  const splitstone = 5.78
  assert.ok(coastalSurface(coastPoint(driftwood, 0.88)).sand > 0.8)
  assert.ok(coastalSurface(coastPoint(splitstone, 0.88)).sand < 0.1)
  assert.ok(coastalSurface(coastPoint(splitstone, 0.99)).rock > 0.7)
  const wetness = [0.94, 0.96, 0.98, 1].map((r) => coastalSurface(coastPoint(driftwood, r)).wet)
  for (const [index, wet] of wetness.entries()) assert.ok(index === 0 || wet > wetness[index - 1])

  const crest = { x: 39.5, z: -25.7 }
  const meadow = { x: 39.5, z: -18 }
  assert.ok(coastRadius(crest) < 0.82)
  assert.ok(groundHeight(crest) - groundHeight(meadow) > 0.8)
  assert.ok(coastalSurface(crest).duneGrass > 0.6)
  assert.equal(coastalSurface(meadow).duneGrass, 0)
})

test('the Driftwood sandpipers run and probe on exposed wet sand clear of beach towels', () => {
  for (let bird = 0; bird < driftwoodSandpipers.count; bird++) {
    const samples = Array.from({ length: 180 }, (_, i) => sandpiperPose(i / 9, bird))
    assert.ok(samples.some(({ feeding }) => feeding))
    assert.ok(samples.some(({ stride }) => stride > 0.5))
    for (const point of samples) {
      const surface = coastalSurface(point)
      assert.ok(point.y >= waterLevel && surface.sand > 0.8 && surface.wet > 0.25)
      assert.equal(onBeachTowel(point), false)
    }
  }
  const time = 1.4
  const rest = sandpiperPose(time, 0)
  const approached = sandpiperPose(time, 0, [{ x: rest.x - 0.6, z: rest.z }])
  assert.equal(rest.feeding, true)
  assert.equal(approached.feeding, false)
  assert.ok(approached.x > rest.x)
})

test('sandpipers retain space under approaching crew and yield continuously to two walkers', () => {
  const mergeTime = 84.2
  const a = sandpiperPose(mergeTime, 1)
  const b = sandpiperPose(mergeTime, 2)
  const walkers = [{ x: a.x - 0.8, z: a.z }, { x: b.x + 0.8, z: b.z }]
  for (const crew of [[], walkers]) {
    const left = sandpiperPose(mergeTime, 1, crew)
    const right = sandpiperPose(mergeTime, 2, crew)
    assert.ok(Math.hypot(left.x - right.x, left.z - right.z) > 0.28)
  }

  const restTime = 1.4
  const bird = sandpiperPose(restTime, 0)
  const shift = (dx) => [-0.75, 0.75].map((offset) => ({ x: bird.x + offset + dx, z: bird.z }))
  const left = sandpiperPose(restTime, 0, shift(-0.001))
  const right = sandpiperPose(restTime, 0, shift(0.001))
  assert.ok(Math.hypot(left.x - right.x, left.z - right.z) < 0.01)
  assert.equal(left.stride, 0)
  assert.equal(right.stride, 0)
})
