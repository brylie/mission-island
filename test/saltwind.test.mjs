import assert from 'node:assert/strict'
import test from 'node:test'
import { ferryTrack, fishingPier, islandLoop, quayRoad, routes, sampleRoute } from '../src/second-island/routes.ts'
import { arrival, landBounds, pavedYards, roundYards, runway, sites, villages, waterfront } from '../src/second-island/sites.ts'
import { bridgeAt, deckSection, dryLandKm2, fallsX, groundHeight, shoreAccess, surfaceHeight, waterHeight } from '../src/second-island/terrain.ts'
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
