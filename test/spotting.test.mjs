import assert from 'node:assert/strict'
import test from 'node:test'
import { houseRoofRise } from '../src/assets/geometry/starter-house.ts'
import { finderReading } from '../src/wildfire.ts'
import { fireFinder, fireWatch } from '../src/fire-watch.ts'
import { fireWatchGeometry } from '../src/assets/geometry/fire-watch.ts'
import {
  bearingDegrees,
  binocularEyeHeightM,
  canUseBinoculars,
  compassName,
  rangeFind,
  rangeReadout,
  rangefinderReachM,
  withinMarkReach,
} from '../src/spotting.ts'
import { fireWatchBaseHeight, groundHeight, waterLevel } from '../src/terrain.ts'
import { buildings, skiffStart, town } from '../src/world.ts'

const origin = { x: 0, z: 0 }

test('bearings run clockwise from north at +z, and each names its compass point', () => {
  assert.equal(bearingDegrees(origin, { x: 0, z: 10 }), 0)
  assert.equal(bearingDegrees(origin, { x: 10, z: 0 }), 90)
  assert.equal(bearingDegrees(origin, { x: 0, z: -10 }), 180)
  assert.equal(bearingDegrees(origin, { x: -10, z: 0 }), 270)
  assert.equal(bearingDegrees(origin, { x: -0.001, z: 10 }), 0, 'Just west of north rounds to 0, never 360')
  assert.deepEqual([0, 44, 46, 90, 180, 225, 267, 315, 338, 359].map(compassName), ['north', 'north-east', 'north-east', 'east', 'south', 'south-west', 'west', 'north-west', 'north', 'north'])
})

test('the fire finder still reads its bearings through the shared helpers', () => {
  const fire = { id: 1, site: 'meadow-slope', size: 'spot', startedAt: 0, located: false, hotspots: [] }
  const reading = finderReading(fire)
  assert.equal(reading.direction, compassName(reading.degrees))
  assert.ok(reading.degrees >= 0 && reading.degrees < 360)
  assert.ok(Number.isFinite(fireFinder.x))
})

test('the rangefinder meets the ground where a downward beam reaches it', () => {
  const target = { x: town.x, z: town.z - 20 }
  const eye = { x: target.x, y: groundHeight(target) + 30, z: target.z - 30 }
  const hit = rangeFind(eye, { x: 0, y: -1, z: 1 })
  assert.ok(hit)
  assert.equal(hit.surface, 'ground')
  assert.ok(Math.abs(hit.y - groundHeight(hit)) < 0.1, 'The hit lies on the ground')
  assert.ok(Math.abs(hit.metres - Math.hypot(hit.x - eye.x, hit.y - eye.y, hit.z - eye.z)) < 1e-6, 'The reading is the line-of-sight distance')
})

test('the rangefinder reads the sea surface, not the seabed', () => {
  assert.ok(groundHeight(skiffStart) < waterLevel, 'The skiff starts over water')
  const eye = { x: skiffStart.x, y: waterLevel + 10, z: skiffStart.z }
  const hit = rangeFind(eye, { x: 0, y: -1, z: 0 })
  assert.equal(hit.surface, 'water')
  assert.ok(Math.abs(hit.y - waterLevel) < 0.05)
  assert.ok(Math.abs(hit.metres - 10) < 0.05)
})

test('the rangefinder stops at a house wall before the ground behind it', () => {
  const house = buildings[0]
  const height = (house.h + houseRoofRise) / 2
  const eye = { x: house.x, y: height, z: house.z - house.d / 2 - 15 }
  const hit = rangeFind(eye, { x: 0, y: 0, z: 1 })
  assert.equal(hit.surface, 'building')
  assert.ok(Math.abs(hit.metres - 15) < 0.05, `Expected the wall 15 m ahead, read ${hit.metres}`)
})

test('the sky and anything past reach read as a dash', () => {
  const eye = { x: town.x, y: groundHeight(town) + binocularEyeHeightM, z: town.z }
  assert.equal(rangeFind(eye, { x: 0, y: 1, z: 1 }), undefined)
  assert.equal(rangeFind(eye, { x: 0, y: 0, z: 0 }), undefined)
  assert.equal(rangeFind({ x: 0, y: 500, z: 0 }, { x: 0, y: -1, z: 0 }, 100), undefined)
  assert.equal(rangeReadout(undefined, 267), '— · 267° west')
  assert.equal(rangeReadout(84.4, 267), '84 m · 267° west')
})

test('binoculars come out only on foot, and marks stay within reach', () => {
  const state = { aviation: { flight: null }, farmWork: { barrow: null } }
  const crew = { id: 0, connected: true, seat: null, swimming: false, sleeping: false }
  assert.ok(binocularEyeHeightM > 1.4 && binocularEyeHeightM < 1.7, 'Eyes sit at a person’s height')
  assert.equal(canUseBinoculars(state, crew), true)
  for (const busy of [{ seat: 'driver' }, { swimming: true }, { sleeping: true }, { connected: false }]) {
    assert.equal(canUseBinoculars(state, { ...crew, ...busy }), false)
  }
  assert.equal(canUseBinoculars({ ...state, aviation: { flight: { pilotId: 0 } } }, crew), false)
  assert.equal(canUseBinoculars({ ...state, farmWork: { barrow: { handler: 0 } } }, crew), false)
  assert.equal(withinMarkReach(origin, { x: rangefinderReachM, z: 0 }), true)
  assert.equal(withinMarkReach(origin, { x: rangefinderReachM + 10, z: 0 }), false)
})

test('the Fire Watch stops the beam from outside, but a lookout inside the cab ranges past it', () => {
  const base = fireWatchBaseHeight()
  const outside = { x: fireWatch.x - 20, y: base + fireWatchGeometry.deck.top + 1.5, z: fireWatch.z }
  const hit = rangeFind(outside, { x: 1, y: 0, z: 0 })
  assert.equal(hit.surface, 'building')
  assert.ok(hit.metres < 20 && hit.metres > 15, `Expected the cab about 17 m ahead, read ${hit.metres}`)
  const inside = { x: fireFinder.x + 0.9, y: base + fireWatchGeometry.deck.top + binocularEyeHeightM, z: fireFinder.z }
  const out = rangeFind(inside, { x: -1, y: -0.2, z: 0 })
  assert.notEqual(out.surface, 'building')
  assert.ok(out.metres > 10, 'The reading is the ground beyond the deck')
})
