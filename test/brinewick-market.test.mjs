import assert from 'node:assert/strict'
import test from 'node:test'
import { brinewickMarketAt, brinewickMarketStops } from '../src/second-island/brinewick-market.ts'
import { villageWalks } from '../src/second-island/footways.ts'
import { islandBuildings, streetCanopy } from '../src/second-island/lots.ts'
import { accessLanes } from '../src/second-island/routes.ts'
import { pavedYards, sites } from '../src/second-island/sites.ts'
import { flatbedGroundDrive } from '../src/vehicles/flatbed.ts'
import { nextDawn, weatherAt } from '../src/weather.ts'

test('Brinewick sets up at dawn, trades, and settles the covers as the market closes', () => {
  assert.equal(brinewickMarketAt({ hour: 5.49, rain: 0 }).phase, 'closing')
  assert.equal(brinewickMarketAt({ hour: 5.5, rain: 0 }).phase, 'setup')
  assert.equal(brinewickMarketAt({ hour: 11.49, rain: 0 }).phase, 'setup')
  assert.equal(brinewickMarketAt({ hour: 11.5, rain: 0 }).phase, 'trading')
  assert.deepEqual(brinewickMarketAt({ hour: 17, rain: 0 }), { phase: 'closing', net: null, cover: 0 })
  const mid = brinewickMarketAt({ hour: 17.1, rain: 0 }).cover
  assert.ok(mid > 0 && mid < 1)
  assert.equal(brinewickMarketAt({ hour: 18, rain: 0.8 }).cover, 1)
  assert.equal(brinewickMarketAt(weatherAt(nextDawn(301))).phase, 'setup')
})

test('a rainy setup restores directly to the rack inside the existing awning footprint', () => {
  const hall = islandBuildings.find((b) => b.site === 'fish-market')
  const awningLeft = hall.x - hall.width * streetCanopy.widthRatio / 2
  const awningRight = hall.x + hall.width * streetCanopy.widthRatio / 2
  const awningBack = hall.z + hall.depth / 2
  const awningFront = awningBack + streetCanopy.depth
  const dry = brinewickMarketAt({ hour: 8, rain: 0 })
  const wet = brinewickMarketAt(weatherAt(100))
  assert.equal(dry.net, 'outdoorRack')
  assert.equal(wet.net, 'shelteredRack')
  assert.deepEqual(brinewickMarketAt(weatherAt(100)), wet)
  const outdoor = brinewickMarketStops[dry.net], sheltered = brinewickMarketStops[wet.net]
  assert.ok(outdoor.z - outdoor.depth / 2 > awningFront)
  assert.ok(sheltered.z - sheltered.depth / 2 > awningBack && sheltered.z + sheltered.depth / 2 < awningFront)
  assert.ok(sheltered.x - sheltered.width / 2 > awningLeft && sheltered.x + sheltered.width / 2 < awningRight)
})

test('market fixtures clear the storefront walk, delivery lane, marked bay, and flatbed turning envelope', () => {
  const walk = villageWalks.find(({ name }) => name === 'fish-market').points
  const lane = accessLanes.find(({ name }) => name === 'Fish Market Delivery')
  const apron = pavedYards.find(({ id }) => id === 'fish-market')
  const { stop } = sites.find(({ id }) => id === 'fish-market')
  function distanceToFixture(point, fixture) {
    return Math.hypot(Math.max(0, Math.abs(point.x - fixture.x) - fixture.width / 2), Math.max(0, Math.abs(point.z - fixture.z) - fixture.depth / 2))
  }
  assert.ok(walk.length > 2 && lane.samples.length > 2)
  for (const fixture of Object.values(brinewickMarketStops)) {
    // The 1.45 m walk plus room for the preview walker's collision radius.
    assert.ok(walk.every((point) => distanceToFixture(point, fixture) > 1), fixture.id)
    assert.ok(lane.samples.every((point) => distanceToFixture(point, fixture) > lane.width / 2), fixture.id)
    assert.ok(fixture.x + fixture.width / 2 < apron.x - apron.width / 2, fixture.id)
  }
  const [rear, front] = flatbedGroundDrive.wheels.axles
  const turnRadius = (front - rear) / Math.tan(flatbedGroundDrive.steering.lowSpeedAngle)
  const halfWidth = 1.5, halfLength = 3.15 // 3 × 6.3 m exterior envelope
  const outerRadius = Math.hypot(turnRadius + halfWidth, halfLength - rear)
  assert.ok(halfWidth < lane.width / 2)
  assert.ok(Math.abs(apron.x - stop.x) + outerRadius < apron.width / 2)
  assert.ok(Math.abs(apron.z - stop.z) + outerRadius < apron.depth / 2)
})
