import assert from 'node:assert/strict'
import test from 'node:test'
import { boundaryBuoys, buoyBoundaryPoint, coastPoint, coastRadius, groundHeight, waterLevel, withinSkiffBoundary } from '../src/terrain.ts'
import { createStarterCoast, starterCoastSeed } from '../src/worlds/starter/coastline.ts'

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
