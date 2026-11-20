import assert from 'node:assert/strict'
import test from 'node:test'
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js'
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import { Scene } from '@babylonjs/core/scene.js'
import { ferryTrack, fishingPier, islandLoop, quayRoad, routes, sampleRoute } from '../src/second-island/routes.ts'
import { arrival, lowerLake, tarn, landBounds, pavedYards, roundYards, runway, sites, villages, waterfront } from '../src/second-island/sites.ts'
import { bridgeAt, deckSection, dryLandKm2, fallsY, nearestRoad, fallsX, groundHeight, shoreAccess, surfaceHeight, waterHeight } from '../src/second-island/terrain.ts'
import { villageWalks } from '../src/second-island/footways.ts'
import { clearCameraDistance, placeWalker, ScenerySolids, walkSaltwind } from '../src/second-island/walking.ts'
import { tour } from '../src/second-island/tour.ts'

const at = ({ x, z }, sample) => sample(x, z)
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

test('Saltwind has a reproducible dry footprint and separate surveyed coast, lake and fairway', () => {
  const area = dryLandKm2(1)
  assert.ok(area >= .40 && area <= .45)
  assert.ok(Math.abs(area - dryLandKm2(2)) < .001)
  assert.equal(area, dryLandKm2(1))
  for (const edge of [landBounds.minX, landBounds.maxX]) {
    for (let z = landBounds.minZ; z <= landBounds.maxZ; z += 5) assert.ok(groundHeight(edge, z) <= waterHeight(edge, z))
  }
  for (const edge of [landBounds.minZ, landBounds.maxZ]) {
    for (let x = landBounds.minX; x <= landBounds.maxX; x += 5) assert.ok(groundHeight(x, edge) <= waterHeight(x, edge))
  }
  assert.ok(groundHeight(-82, 104) < waterHeight(-82, 104))
  assert.ok(groundHeight(-123, 219) < waterHeight(-123, 219))
})

test('the tour follows continuous surfaces between the ferry and all three villages', () => {
  const legs = tour.flatMap((stop) => stop.legs)
  const starts = legs.map(({ route, from }) => sampleRoute(route, from))
  const ends = legs.map(({ route, to }) => sampleRoute(route, to))
  assert.ok(distance(arrival, starts[0]) < .01)
  assert.ok(distance(arrival, ends.at(-1)) < .01)
  for (let i = 1; i < legs.length; i++) {
    assert.ok(distance(starts[i], ends[i - 1]) < .01)
    assert.ok(Math.abs(starts[i].y - ends[i - 1].y) < .01)
  }
  assert.deepEqual(tour.slice(1, 4).map(({ name }) => name), villages.map(({ name }) => name))
  assert.ok(distance(islandLoop.samples[0], quayRoad.samples.at(-1)) < .01)
  assert.ok(distance(islandLoop.samples[0], islandLoop.samples.at(-1)) < .01)
})

test('preview road surfaces carry the route through each bridge and keep local grades bounded', () => {
  const roadLimits = new Map([['Saltwind Loop', .15], ['Ferry Approach', .15], ['Mill Road', .13], ['Slatecliff Road', .17], ['Airfield Lane', .13], ['Ferry Deck', .145],
    ['Fish Market Delivery', .15], ['Farmers Market Delivery', .15], ['Hospital West Access', .14], ['Hospital East Access', .14],
    ['Fire Station West Access', .15], ['Fire Station East Access', .17]])
  for (const route of [...routes, ferryTrack]) {
    const limit = roadLimits.get(route.name)
    if (!limit) continue
    let before
    for (const sample of route.samples) {
      const y = at(sample, surfaceHeight)
      assert.ok(y >= at(sample, waterHeight), route.name)
      assert.ok(Math.abs(y - deckSection(sample, route)[1].y) < .27, `${route.name} centre at ${sample.x}, ${sample.z}`)
      if (before) assert.ok(Math.abs(y - before.y) <= limit * (sample.distance - before.distance), route.name)
      before = { y, distance: sample.distance }
    }
  }
  for (const [routeName, x, z] of [['Saltwind Loop', -351, 12], ['Mill Road', -204, 53], ['Saltwind Loop', fallsX(153), 153]]) {
    assert.ok(bridgeAt(routes.find(({ name }) => name === routeName), { x, z }))
    assert.ok(groundHeight(x, z) < waterHeight(x, z))
    assert.ok(surfaceHeight(x, z) > waterHeight(x, z) + 2)
  }
})

test('the ferry, pier, rescue slip, runway and staging pads use separate shared support surfaces', () => {
  assert.ok(at(arrival, groundHeight) < 0)
  assert.ok(at(arrival, surfaceHeight) > 1.6)
  assert.ok(at(fishingPier.samples.at(-1), surfaceHeight) > 1.6)
  assert.ok(shoreAccess(-311, -237).wade)
  assert.ok(shoreAccess(-311, -238).wade && shoreAccess(-311, -238).boat)
  const launch = at(waterfront.skiffLaunch, shoreAccess)
  assert.ok(launch.boat && !launch.wade)
  for (const x of [runway.x - runway.length / 2 + 2, runway.x, runway.x + runway.length / 2 - 2]) {
    for (const z of [runway.z, runway.z - runway.width / 2 + 1, runway.z + runway.width / 2 - 1]) {
      assert.ok(Math.abs(groundHeight(x, z) - runway.y) < .015)
      assert.equal(surfaceHeight(x, z), runway.y + .07)
    }
  }
  for (const route of routes.filter(({ name }) => name.endsWith('Access') || name.endsWith('Delivery'))) {
    const stop = route.samples.at(-1)
    assert.ok(Math.abs(at(stop, surfaceHeight) - stop.y) < .35)
    assert.ok(islandLoop.samples.some((p) => distance(p, route.samples[0]) < .01))
  }
  for (const pad of [...pavedYards, ...roundYards]) assert.ok(at(pad, surfaceHeight) >= pad.y, pad.id)
  const mine = roundYards.find(({ id }) => id === 'mine')
  for (let i = -12; i <= 12; i += 2) for (let j = -12; j <= 12; j += 2) {
    if (Math.hypot(i, j) < mine.radius - 2) assert.ok(groundHeight(mine.x + i, mine.z + j) < mine.y)
  }
  for (const site of sites) assert.ok(at(site.stop, surfaceHeight) >= at(site.stop, waterHeight), site.id)
})

test('all village front walks meet a road and stay walkable to their doorstep', () => {
  const solids = new ScenerySolids()
  for (const { points, name } of villageWalks) {
    assert.ok(points.length >= 2, name)
    const end = points.at(-1), near = nearestRoad(end.x, end.z)
    assert.ok(Math.abs(near.distance - near.road.width / 2) < .15, name)
    const walker = placeWalker(end)
    for (let i = points.length - 2; i >= 0; i--) {
      const dx = points[i].x - walker.x, dz = points[i].z - walker.z
      walkSaltwind(walker, solids, dx * 8, dz * 8, false, 1 / 8)
      assert.ok(distance(walker, points[i]) < .02 && !walker.swimming, name)
    }
  }
})

test('model batching preserves world-space obstacle dimensions and openings', (t) => {
  const engine = new NullEngine(), scene = new Scene(engine)
  t.after(() => { scene.dispose(); engine.dispose() })
  const shelter = new TransformNode('waiting shelter', scene)
  shelter.position.set(-19, 3, -11)
  shelter.rotation.y = Math.PI / 2
  shelter.scaling.setAll(1.2)
  const post = CreateBox('post', { width: .14, depth: .2, height: 2.4 }, scene)
  post.parent = shelter
  post.position.set(1.5, 1.2, .5)
  const roof = CreateBox('roof', { width: 3.2, height: .15, depth: 2 }, scene)
  roof.parent = shelter
  roof.position.y = 2.45
  const solids = new ScenerySolids()
  solids.capture(shelter.getChildMeshes())
  shelter.dispose()
  assert.ok(solids.at(-18.4, -12.8, .2).some((part) => Math.abs(part.bottom - 3) < .001))
  const aboveSeat = solids.at(-19, -11, .28)
  assert.equal(aboveSeat.length, 1)
  assert.ok(aboveSeat[0].bottom > 5.8)
  assert.equal(solids.at(-17.35, -11, .1).length, 0)
})

test('the pedestrian stops at a rotated seat, jumps onto it and can pass beneath a shelter roof', () => {
  const p = placeWalker({ x: runway.x, z: runway.z }), y = p.y
  const solids = new ScenerySolids()
  solids.add({ x: p.x, z: p.z + 2, bottom: y, top: y + .57, width: .55, depth: 1.7, heading: Math.PI / 2 })
  solids.add({ x: p.x, z: p.z, bottom: y + 2.42, top: y + 2.57, width: 2.5, depth: 2.5, heading: 0 })
  for (let i = 0; i < 30; i++) walkSaltwind(p, solids, 0, 10, false, 1 / 30)
  assert.ok(p.z > runway.z + 1.3 && p.z < runway.z + 1.5)
  for (let i = 0; i < 90; i++) walkSaltwind(p, solids, 0, p.z < runway.z + 2 ? 3 : 0, i === 0, 1 / 90)
  assert.ok(p.grounded && Math.abs(p.y - y - .57) < .001)
  const wall = { x: p.x + 2, z: p.z, bottom: y, top: y + 5, width: .12, depth: 3, heading: 0 }
  solids.add(wall)
  const fraction = clearCameraDistance(p, solids, 4, 0, 0)
  assert.ok(fraction > .3 && fraction < .5)
})

test('a swimmer can return via the rescue slip and swim below the high viaduct', () => {
  const solids = new ScenerySolids()
  const p = placeWalker(waterfront.skiffLaunch)
  assert.ok(p.swimming)
  for (let i = 0; i < 130; i++) walkSaltwind(p, solids, 0, 3.8, false, 1 / 30)
  assert.ok(!p.swimming && p.grounded && p.z > -225 && p.y > 1)
  const under = { x: fallsX(153), z: 152, y: waterHeight(fallsX(153), 152) - 1.01,
    grounded: false, swimming: true, velocity: 0 }
  for (let i = 0; i < 20; i++) walkSaltwind(under, solids, 0, 3.8, false, 1 / 30)
  assert.ok(under.swimming && under.y < surfaceHeight(under.x, under.z) - 10 && under.z > 154)
})

test('Tarnstep follows the streambed downhill from the tarn into Mirror Lake', () => {
  let last = tarn.y
  for (let z = 199; z >= 123; z -= .5) {
    const x = fallsX(z), y = fallsY(z)
    assert.ok(y <= last + 1e-8 && groundHeight(x, z) < y, String(z))
    assert.ok(Math.abs(y - waterHeight(x, z)) < .16, String(z))
    last = y
  }
  assert.ok(Math.abs(last - lowerLake.y) < .001)
})
