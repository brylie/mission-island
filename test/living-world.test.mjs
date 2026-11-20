import assert from 'node:assert/strict'
import test from 'node:test'
import { createCargoPhysics } from '../server/cargo.ts'
import { jobBoard } from '../src/jobs.ts'
import { canWalkAt, recoverSceneryOverlap, stepPlayerOnTerrain } from '../server/movement.ts'
import { footpaths, shellglassPoint, walkways } from '../src/routes.ts'
import { overlapsProp, propTop, starterDiscoveries } from '../src/scenery.ts'
import { habitatAt, habitatColor } from '../src/second-island/habitats.ts'
import { saltwindFeatures } from '../src/second-island/site-features.ts'
import { landmarks, sites, viaductWalk } from '../src/second-island/sites.ts'
import { groundHeight, nearestRoad, surfaceHeight, waterHeight } from '../src/second-island/terrain.ts'
import { starterFeatures } from '../src/starter-sites.ts'
import { fernfallSection, streamX, walkingHeight, waterDepth, waterLevel } from '../src/terrain.ts'
import { birdActivity, phenomenonStrength, schoolAvoidance } from '../src/wildlife-motion.ts'
import { beach, buildings, crateSize, extinguisherStarts, forest, jumpSpeed, spawns, truckStart } from '../src/world.ts'

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
  const decorated = new Set(saltwindFeatures.map(({ site }) => site))
  assert.equal(decorated.size, saltwindFeatures.length)
  for (const id of decorated) assert.ok(landmarks.some((pin) => pin.id === id), id)
  for (const pin of landmarks.filter((pin) => pin.discoverable)) assert.ok(decorated.has(pin.id), pin.name)
  const starterIds = starterFeatures.map(({ site }) => site)
  assert.equal(new Set(starterIds).size, starterIds.length)
  for (const { id } of starterDiscoveries) assert.ok(starterIds.includes(id), id)
  for (const point of starterFeatures) {
    assert.ok(walkingHeight(point) >= waterLevel, point.name)
    assert.ok(overlapsProp(point, .14), point.name)
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

test('each starter site can be approached from the cottage on dry ground', () => {
  const spacing = .75
  const start = { x: Math.round(spawns[0].x / spacing) * spacing, z: Math.round(spawns[0].z / spacing) * spacing }
  const reachable = [start]
  const key = ({ x, z }) => `${x},${z}`
  const visited = new Set([key(start)])
  const steps = [[spacing, 0], [-spacing, 0], [0, spacing], [0, -spacing]]
  for (let i = 0; i < reachable.length; i++) {
    const point = reachable[i]
    const height = walkingHeight(point)
    for (const [dx, dz] of steps) {
      const next = { x: point.x + dx, z: point.z + dz }
      const id = key(next)
      if (visited.has(id) || !canWalkAt(next, .4, waterLevel) ||
        Math.abs(walkingHeight(next) - height) > spacing * 1.12) continue
      visited.add(id)
      reachable.push(next)
    }
  }
  const arrivals = [beach, forest, jobBoard, ...extinguisherStarts, ...starterDiscoveries.map(({ site }) => site)]
  for (const site of [...starterFeatures, ...arrivals]) {
    assert.ok(reachable.some(({ x, z }) => Math.hypot(x - site.x, z - site.z) < 1.5), site.name ?? JSON.stringify(site))
  }
})

test('Seabrook pavements have clear walking lanes and setbacks on both sides', () => {
  for (const path of walkways.slice(0, 2)) {
    for (const point of walkSamples(path.points)) {
      for (const side of [-1, 0, 1]) {
        assert.ok(canWalkAt({ ...point, z: point.z + side * (path.width / 2 - .4) }, .4, waterLevel))
      }
      for (const house of buildings.filter((b) => Math.abs(point.x - b.x) < b.w / 2)) {
        const setback = Math.abs(house.z - point.z) - house.d / 2 - .175 - path.width / 2
        assert.ok(setback > 2, path.name)
      }
    }
  }
  const player = { x: 39, z: 1.7, y: 0, grounded: true }
  recoverSceneryOverlap(player)
  assert.ok(canWalkAt(player, .4, waterLevel))
  assert.ok(Math.hypot(player.x - 39, player.z - 1.7) < 4)
})

test('a walking player stops at the bench and can jump onto its seat', () => {
  const bench = starterFeatures.find((feature) => feature.model === 'bench')
  const player = { x: bench.x, z: bench.z - 1, y: 0, heading: 0, grounded: true }
  const motor = { player, verticalSpeed: 0 }
  function tick(z) {
    stepPlayerOnTerrain(motor, [], { x: 0, z }, false, 1 / 60, () => -Infinity)
  }
  for (let i = 0; i < 30; i++) tick(1)
  assert.ok(player.z < bench.z - .26)
  motor.verticalSpeed = jumpSpeed
  player.grounded = false
  for (let i = 0; i < 90; i++) tick(player.z < bench.z - .13 ? 1 : 0)
  assert.ok(player.grounded && Math.abs(player.y - .57) < .001)
  assert.equal(propTop({ x: bench.x, z: bench.z + .22 }, 0), 1.035)
})

test('loose freight comes to rest on a solid scenery crate', () => {
  const physics = createCargoPhysics()
  const stack = starterFeatures.find((f) => f.site === 'harbor')
  const crate = { kind: 'crate', id: 0, heading: 0, holder: null }
  const point = { x: stack.x + .33, z: stack.z - .065 }
  physics.release(crate, point, 3)
  let truck = physics.parkTruck(truckStart)
  for (let i = 0; i < 100; i++) truck = physics.step([crate], truck, { x: 0, z: 0 }, 1 / 30)
  assert.ok(Math.abs(crate.y - crateSize / 2 - propTop(point, 0)) < .03)
})

test('Fernfall runs downhill with a submerged bed, raised banks and a continuous pool outlet', () => {
  let previous = Infinity
  for (let z = 81; z <= 91.4; z += .12) {
    const { y, halfWidth } = fernfallSection(z)
    assert.ok(y <= previous)
    previous = y
    assert.ok(walkingHeight({ x: streamX(z), z }) < y - .1)
    if (z < 89.5) for (const side of [-1, 1]) {
      assert.ok(walkingHeight({ x: streamX(z) + side * (halfWidth + .22), z }) > y)
    }
  }
  assert.ok(previous < waterLevel)
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
