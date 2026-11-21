import assert from 'node:assert/strict'
import test from 'node:test'
import { ridgeStep, startRidgeFlight, stepRidgeFlight } from '../src/simulation/ridge-flight.ts'
import { stepPlayerOnTerrain } from '../src/simulation/movement.ts'
import { groundHeight } from '../src/terrain.ts'
import { distance, localPoint, offset } from '../src/world.ts'
import { ridgeHeading, ridgeLandingRadius, ridgeLaunch, ridgeMeadow, ridgeReturn, ridgeUpdraft } from '../src/worlds/starter/ridge-scout.ts'

function fly(inputs) {
  const flight = startRidgeFlight()
  let launchClearance = Infinity
  for (let tick = 0; tick < 360 && !flight.outcome; tick++) {
    stepRidgeFlight(flight, inputs(flight.elapsed))
    if (distance(flight.pilot, ridgeLaunch) <= 7) {
      launchClearance = Math.min(launchClearance, flight.pilot.y - groundHeight(flight.pilot))
    }
  }
  return { flight, launchClearance }
}

test('the rendered wing and pilot clear Windstone and land with neutral input and modest corrections', () => {
  const neutral = fly(() => ({ turn: 0, pitch: 0 }))
  assert.ok(distance(neutral.flight.pilot, ridgeMeadow) < 1)
  for (const direction of [-1, 1]) {
    const bank = fly((t) => ({ turn: t > 0.8 && t < 1.24 ? 0.55 * direction : 0, pitch: 0 }))
    const correction = fly((t) => ({
      turn: t > 0.75 && t < 1.2 ? 0.7 * direction : t > 2 && t < 2.45 ? -0.7 * direction : 0,
      pitch: 0,
    }))
    for (const { flight, launchClearance } of [neutral, bank, correction]) {
      assert.equal(flight.outcome, 'field')
      assert.ok(launchClearance > 0.5)
      assert.ok(flight.clearance > 0.5)
      assert.ok(Math.abs(flight.bank) < 0.001)
    }
    assert.ok(distance(correction.flight.pilot, ridgeMeadow) < distance(bank.flight.pilot, ridgeMeadow))
  }
})

test('each direction lowers the inside wing and turns toward it', () => {
  const outbound = { ...ridgeLaunch, heading: ridgeHeading }
  for (const turn of [-1, 1]) {
    const flight = startRidgeFlight()
    for (let tick = 0; tick < 14; tick++) stepRidgeFlight(flight, { turn, pitch: 0 })
    assert.equal(Math.sign(flight.bank), -turn)
    assert.equal(Math.sign(flight.pilot.heading - ridgeHeading), turn)
    assert.equal(Math.sign(localPoint(outbound, flight.pilot).x), turn)
  }
})

test('pitch down builds speed and altitude loss while pitching up does the inverse', () => {
  const start = { ...ridgeLaunch, heading: ridgeHeading }
  const neutral = startRidgeFlight(), down = startRidgeFlight(), up = startRidgeFlight()
  for (let tick = 0; tick < 66; tick++) {
    stepRidgeFlight(neutral, { turn: 0, pitch: 0 })
    stepRidgeFlight(down, { turn: 0, pitch: tick > 40 ? 1 : 0 })
    stepRidgeFlight(up, { turn: 0, pitch: tick > 40 ? -1 : 0 })
  }
  assert.ok(down.pitch > 0 && up.pitch < 0)
  assert.ok(down.pilot.y < neutral.pilot.y && neutral.pilot.y < up.pilot.y)
  const [fast, cruise, slow] = [down, neutral, up].map(({ pilot }) => localPoint(start, pilot).z)
  assert.ok(fast > cruise && cruise > slow)
})

test('the windward updraft adds height and time to scout inland', () => {
  const direct = fly(() => ({ turn: 0, pitch: 0 })).flight
  const flight = startRidgeFlight()
  let climbed = false
  let resumedDescent = false
  let highest = flight.pilot.y
  for (let tick = 0; tick < 700 && !flight.outcome; tick++) {
    const time = flight.elapsed
    stepRidgeFlight(flight, { turn: time < 1.2 ? -1 : time > 4 && time < 8 ? 1 : 0, pitch: 0 })
    highest = Math.max(highest, flight.pilot.y)
    if (flight.climbing) {
      assert.ok(distance(flight.pilot, ridgeUpdraft) < ridgeUpdraft.radius)
      climbed = true
    }
    else if (climbed && !flight.outcome) resumedDescent = true
  }
  assert.ok(climbed && resumedDescent)
  assert.ok(highest > groundHeight(ridgeLaunch) + 10)
  assert.ok(highest < groundHeight(ridgeUpdraft) + ridgeUpdraft.ceiling)
  assert.ok(flight.elapsed > direct.elapsed * 2)
  assert.equal(flight.outcome, 'missed')
  assert.ok(distance(flight.pilot, ridgeMeadow) > 25)
})

test('touchdown follows the circular landing boundary', () => {
  const meadow = { ...ridgeMeadow, heading: ridgeHeading }
  for (const [lateral, along, outcome] of [[ridgeLandingRadius - 0.25, 0, 'field'], [4.7, 6.5, 'missed']]) {
    const flight = startRidgeFlight()
    const point = offset(meadow, lateral, along)
    Object.assign(flight.pilot, point, { y: groundHeight(point) + 0.01 })
    flight.elapsed = 6
    stepRidgeFlight(flight, { turn: 0, pitch: 0 })
    assert.equal(flight.outcome, outcome)
  }
})

test('a pilot can walk back to Windstone after landing inside or short of the meadow', () => {
  for (const early of [false, true]) {
    const { flight } = fly((t) => ({ turn: 0, pitch: Number(early && t > 1.8) }))
    assert.equal(flight.outcome, early ? 'early' : 'field')
    const walker = { player: { ...flight.pilot, grounded: true, onBed: false, swimming: false }, verticalSpeed: 0 }
    for (const target of [ridgeReturn, ridgeLaunch]) {
      for (let tick = 0; tick < 160 && distance(walker.player, target) > 0.23; tick++) {
        const { x, z } = walker.player
        stepPlayerOnTerrain(walker, [], { x: target.x - x, z: target.z - z, careful: false, sprint: false, spray: false }, false, ridgeStep, () => -Infinity)
        assert.equal(walker.player.swimming, false)
      }
      assert.ok(distance(walker.player, target) <= 0.23)
    }
    assert.equal(walker.player.grounded, true)
    assert.ok(Math.abs(walker.player.y - groundHeight(ridgeLaunch)) < 0.24)
  }
})

test('an obstructed trial stops at one contact', () => {
  const { flight } = fly(() => ({ turn: 1, pitch: 0 }))
  assert.equal(flight.outcome, 'obstruction')
  const ended = { ...flight, pilot: { ...flight.pilot } }
  stepRidgeFlight(flight, { turn: -1, pitch: 1 })
  assert.deepEqual(flight, ended)
})
