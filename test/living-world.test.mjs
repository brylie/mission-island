import assert from 'node:assert/strict'
import test from 'node:test'
import { footpaths, shellglassPoint } from '../src/routes.ts'
import { overlapsProp, starterDiscoveries } from '../src/scenery.ts'
import { habitatAt, habitatColor } from '../src/second-island/habitats.ts'
import { saltwindFeatures } from '../src/second-island/site-features.ts'
import { landmarks, sites, viaductWalk } from '../src/second-island/sites.ts'
import { groundHeight, nearestRoad, surfaceHeight, waterHeight } from '../src/second-island/terrain.ts'
import { starterFeatures } from '../src/starter-sites.ts'
import { walkingHeight, waterDepth, waterLevel } from '../src/terrain.ts'
import { birdActivity, phenomenonStrength, schoolAvoidance } from '../src/wildlife-motion.ts'

function walkSamples(path) {
  return path.flatMap((a, index) => {
    const b = path[index + 1]
    if (!b) return [a]
    const count = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 4)
    return Array.from({ length: count }, (_, j) => ({
      x: a.x + (b.x - a.x) * j / count,
      z: a.z + (b.z - a.z) * j / count,
    }))
  })
}

test('site signatures leave dry approaches and preserve their discovery IDs', () => {
  assert.deepEqual(new Set(saltwindFeatures.map(({ site }) => site)), new Set(landmarks.map(({ id }) => id)))
  const starterIds = starterFeatures.map(({ site }) => site)
  assert.equal(new Set(starterIds).size, starterIds.length)
  for (const { id } of starterDiscoveries) assert.ok(starterIds.includes(id), id)
  for (const point of starterFeatures) {
    assert.ok(walkingHeight(point) >= waterLevel, point.name)
    assert.ok(!overlapsProp(point, .7), point.name)
  }
  for (const { x, z, name, scale = 1 } of saltwindFeatures) {
    const y = surfaceHeight(x, z)
    const road = nearestRoad(x, z)
    assert.ok(y >= waterHeight(x, z) + .23, name)
    assert.ok(road.distance - (road.road?.width ?? 0) / 2 > scale * .78, name)
    assert.ok(sites.every(({ stop }) => Math.hypot(x - stop.x, z - stop.z) > scale + 2), name)
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      assert.ok(Math.abs(y - surfaceHeight(x + dx, z + dz)) < .32, name)
    }
  }
})

test('the two discovery walks stay above water and avoid sudden steps', () => {
  const driftwood = footpaths.find(({ name }) => name === 'Driftwood shore walk')
  for (const point of walkSamples(driftwood.points)) {
    assert.equal(waterDepth(point), 0)
    assert.ok(!overlapsProp(point, .35))
  }
  assert.equal(starterDiscoveries.find(({ id }) => id === 'shellglass').site, shellglassPoint)
  const start = viaductWalk.path[0]
  assert.ok(nearestRoad(start.x, start.z).distance < 5)
  let before
  for (const { x, z } of walkSamples(viaductWalk.path)) {
    const height = surfaceHeight(x, z)
    assert.ok(height > waterHeight(x, z))
    if (before !== undefined) assert.ok(Math.abs(height - before) < .13)
    before = height
  }
  assert.ok(landmarks.find(({ id }) => id === viaductWalk.id).discoverable)
})

test('Saltwind coast, wetland, meadow, woods and bluff produce distinct, gradual terrain colors', () => {
  const measure = (x, z) => habitatAt(x, groundHeight(x, z), z)
  assert.ok(measure(-284, -245).coast > .75)
  assert.ok(measure(-240, 65).marsh > .6)
  assert.ok(measure(-178, 231).woods > .68)
  assert.ok(measure(300, 96).bluff > .55)
  const meadow = measure(187, 14)
  assert.ok(Object.values(meadow).every((weight) => weight < .2))
  const colorAt = (x, z) => habitatColor(x, groundHeight(x, z), z)
  let previous
  for (let z = 41; z <= 94; z++) {
    const color = colorAt(-242, z)
    if (previous) assert.ok(color.every((channel, i) => Math.abs(channel - previous[i]) < 6))
    previous = color
  }
})

test('fish scatter from nearby swimmers and the skiff, then resume their school route', () => {
  const origin = { x: 10, z: 25 }
  const deep = { x: 0, z: -1 }
  assert.deepEqual(schoolAvoidance(origin, [], deep), { x: 0, z: 0 })
  assert.deepEqual(schoolAvoidance(origin, [{ x: 10, z: 33 }], deep), { x: 0, z: 0 })
  const close = schoolAvoidance(origin, [{ x: 10, z: 25 }, { x: 12, z: 27 }], deep)
  assert.ok(close.x < 0 && close.z < -3)
  assert.ok(Math.hypot(close.x, close.z) <= 4.8 + 1e-9)
})

test('clear days permit landing, rain shelters flocks, and bats emerge after dark', () => {
  const noon = { hour: 12, rain: 0 }
  const dark = { hour: 23, rain: 0 }
  assert.deepEqual(birdActivity(0, noon), { roost: 0, landing: 0, bat: 0 })
  assert.equal(birdActivity(41, noon).landing, 1)
  assert.equal(birdActivity(41, { ...noon, rain: 1 }).roost, .9)
  assert.deepEqual(birdActivity(41, dark), { roost: 1, landing: 0, bat: 1 })
  assert.equal(birdActivity(41, { ...dark, rain: 1 }).bat, 0)
  assert.ok(phenomenonStrength('mist', { hour: 6.8, rain: 0 }) > .9)
  assert.equal(phenomenonStrength('mist', noon), 0)
  assert.ok(phenomenonStrength('spray', { ...noon, rain: 1 }) > phenomenonStrength('spray', noon))
  assert.equal(phenomenonStrength('glow', noon), 0)
  assert.equal(phenomenonStrength('glow', dark), 1)
})
