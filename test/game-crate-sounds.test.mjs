import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCargoPhysics } from '../src/simulation/cargo.ts'
import { createImpactFilter, impactDebounceSeconds, impactStrength, minImpactSpeed } from '../src/simulation/cargo-impacts.ts'
import { groundHeight } from '../src/terrain.ts'
import { truckPoint } from '../src/truck-pose.ts'
import { crateSize, offset, truckBed, truckSideRails, truckStart } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const still = { x: 0, z: 0 }
const open = { x: -30, z: -11 }

function cargoTrial(place, ticks = 120) {
  const physics = createCargoPhysics()
  let truck = physics.parkTruck(truckStart)
  const item = { kind: 'crate', id: 0, holder: null, delivered: false, heading: truckStart.heading, x: 0, y: 0, z: 0 }
  for (let i = 0; i < 30; i++) {
    truck = physics.step([], truck, still, 1 / 30)
    physics.drainImpacts()
  }
  place(physics, item, truck)
  const impacts = []
  for (let tick = 0; tick < ticks; tick++) {
    truck = physics.step([item], truck, still, 1 / 30)
    for (const impact of physics.drainImpacts()) impacts.push({ tick, ...impact })
  }
  return { impacts, item }
}

test('a gentle set-down is quieter than a high drop onto the ground', () => {
  const gentle = cargoTrial((physics, item) => physics.release(item, open))
  const high = cargoTrial((physics, item) => physics.release(item, open, groundHeight(open) + 1.8))
  assert.equal(gentle.impacts[0].surface, 'ground')
  assert.equal(high.impacts[0].surface, 'ground')
  assert.ok(gentle.impacts[0].tick < 3, 'a real release sounds on its first steps')
  assert.ok(high.impacts[0].strength > gentle.impacts[0].strength * 3)
})

test('a crate dropped straight onto the deck sounds like the bed', () => {
  const { impacts, item } = cargoTrial((physics, crate, truck) => {
    const point = truckPoint(truck, 0, truckBed.top + 1.2, truckBed.center)
    physics.release(crate, point, point.y)
  })
  assert.equal(item.onBed, true)
  assert.deepEqual(impacts.map(({ surface }) => surface), ['bed'])
})

test('a crate that grazes a rail on the way down still reports its bed landing', () => {
  const { impacts } = cargoTrial((physics, crate, truck) => {
    const point = truckPoint(truck, truckSideRails.x - crateSize / 2, truckBed.top + 1.3, truckBed.center)
    physics.release(crate, point, point.y)
  })
  assert.deepEqual(impacts.map(({ surface }) => surface), ['ground', 'bed'])
  assert.ok(impacts[1].tick > impacts[0].tick)
})

test('a restored crate makes no sound as the host reloads it', () => {
  const { impacts } = cargoTrial((physics, item) => {
    Object.assign(item, open, { y: groundHeight(open) + crateSize / 2 + 0.03, rotation: null, onBed: false })
    physics.restore(item)
  }, 30)
  assert.deepEqual(impacts, [])
})

test('impact strength is bounded and resting chatter is filtered', () => {
  assert.equal(impactStrength(minImpactSpeed * 0.9), 0)
  assert.equal(impactStrength(Number.NaN), 0)
  assert.equal(impactStrength(80), 1)
  assert.ok(impactStrength(2) > impactStrength(1))
  const filter = createImpactFilter(2)
  const at = { x: 0, y: 0, z: 0 }
  filter.offer(0, { speed: 1.2, surface: 'ground', ...at })
  filter.offer(0, { speed: 3, surface: 'bed', ...at })
  filter.offer(1, { speed: 0.2, surface: 'ground', ...at })
  const [strongest, ...rest] = filter.drain(1)
  assert.equal(strongest.surface, 'bed', 'the strongest substep contact wins before debouncing')
  assert.deepEqual(rest, [])
  filter.offer(0, { speed: 3, surface: 'ground', ...at })
  assert.deepEqual(filter.drain(1 + impactDebounceSeconds / 2), [])
  filter.offer(0, { speed: 3, surface: 'ground', ...at })
  assert.equal(filter.drain(1 + impactDebounceSeconds * 2).length, 1)
})

test('both crewmates hear the same thrown crate land, then nothing while it rests', (t) => {
  const thrower = offset(truckStart, -9, 6)
  const h = setup(t, {
    players: [player(0, thrower), player(1, offset(thrower, 4, 0))],
    arrange: (save) => { save.world.items[0].holder = 0 },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  h.click(a, 0)
  assert.equal(b.state.items[0].holder, null)
  h.advance(90)
  const heard = (client) => client.messages.filter(({ type }) => type === 'crate-impact')
  assert.ok(heard(a).length >= 1)
  assert.deepEqual(heard(a), heard(b))
  assert.equal(heard(a)[0].surface, 'ground')
  assert.equal(new Set(heard(a).map(({ id }) => id)).size, heard(a).length)
  const settled = heard(a).length
  h.advance(90)
  assert.equal(heard(a).length, settled, 'a resting crate stays quiet')
})
