import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { careerUnlockXp, learnerSolids, learnerVehicles, practiceStopXp } from '../src/learner-vehicles.ts'
import { distance, offset } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const { pickup, tractor } = learnerVehicles
const beside = (pose, metres = 2.6) => offset(pose, -metres, 0)

test('crew board the pickup as driver then passenger, and the tractor seats one', (t) => {
  const { join, advance } = setup(t, {
    players: [player(0, beside(pickup.park)), player(1, beside(pickup.park, 2.9)), player(2, beside(tractor.park))],
  })
  const driver = join(tokens[0])
  const passenger = join(tokens[1])
  driver.request('seat')
  advance()
  passenger.request('seat')
  advance()
  assert.deepEqual([driver.player.seat, driver.player.vehicle], ['driver', 'pickup'])
  assert.deepEqual([passenger.player.seat, passenger.player.vehicle], ['passenger', 'pickup'])
  // Neither learner seat counts as the flatbed driver.
  assert.ok(driver.state.players.every((entry) => entry.seat !== 'driver' || entry.vehicle))

  const operator = join(tokens[2])
  operator.request('seat')
  advance()
  assert.deepEqual([operator.player.seat, operator.player.vehicle], ['driver', 'tractor'])
  operator.request('seat')
  advance()
  assert.equal(operator.player.seat, null)
  assert.equal(operator.player.vehicle, undefined)
  const solid = learnerSolids(operator.state.vehicles).find((_, index) => index === 1)
  assert.ok(distance(operator.player, solid) > solid.halfWidth, 'The operator steps out clear of the tractor')
})

test('stopping at the practice stop pays the driver career XP once and advances the stop for the crew', (t) => {
  const stop = pickup.stops[0]
  const { join, hold, checkpoint } = setup(t, {
    players: [player(0, stop, { seat: 'driver', vehicle: 'pickup' }), player(1, stop, { seat: 'passenger', vehicle: 'pickup' })],
    arrange: (save) => { save.world.vehicles = { ...save.world.vehicles, pickup: { ...stop, heading: 0 } } },
  })
  const driver = join(tokens[0])
  const passenger = join(tokens[1])
  hold(driver, 10)
  assert.deepEqual(driver.player.drivingXp, { rescue: practiceStopXp })
  assert.equal(passenger.player.drivingXp, undefined, 'Only the driver earns driving XP')
  assert.equal(driver.state.practice.pickup, 1)
  const notices = driver.messages.filter(({ type }) => type === 'practice-run')
  assert.equal(notices.length, 1)
  assert.equal(notices[0].stop, stop.name)
  assert.ok(checkpoint.mock.callCount() > 0)

  // The next stop is elsewhere, so waiting does not pay again.
  hold(driver, 30)
  assert.deepEqual(driver.player.drivingXp, { rescue: practiceStopXp })
})

test('the run that reaches the threshold qualifies the driver for the Saltwind vehicles', (t) => {
  const stop = tractor.stops[0]
  const { join, hold } = setup(t, {
    players: [player(0, stop, { seat: 'driver', vehicle: 'tractor', drivingXp: { farming: careerUnlockXp - practiceStopXp } })],
    arrange: (save) => { save.world.vehicles = { ...save.world.vehicles, tractor: { ...stop, heading: 0 } } },
  })
  const driver = join(tokens[0])
  hold(driver, 10)
  assert.equal(driver.player.drivingXp.farming, careerUnlockXp)
  assert.equal(driver.messages.find(({ type }) => type === 'practice-run').qualified, true)
})

test('learner vehicle poses, practice stops and career XP survive a host restart', (t) => {
  const moved = { x: pickup.park.x + 3, z: pickup.park.z, heading: pickup.park.heading }
  const first = setup(t, {
    players: [player(0, beside(moved), { drivingXp: { rescue: 30 } })],
    arrange: (save) => {
      save.world.vehicles = { ...save.world.vehicles, pickup: moved }
      save.world.practice = { pickup: 3, tractor: 1 }
    },
  })
  first.join(tokens[0])
  first.advance()
  const saved = first.game.snapshotForSave()
  const second = setup(t, { saved })
  const socket = second.join(tokens[0])
  assert.ok(distance(socket.state.vehicles.pickup, moved) < 0.1)
  assert.deepEqual(socket.state.practice, { pickup: 3, tractor: 1 })
  assert.deepEqual(socket.player.drivingXp, { rescue: 30 })
})

test('a save from before the learner fleet parks both vehicles at their sites', () => {
  const save = createGame().snapshotForSave()
  delete save.world.vehicles
  delete save.world.practice
  const state = createGame({ save }).tick()
  assert.ok(distance(state.vehicles.pickup, pickup.park) < 0.1)
  assert.ok(distance(state.vehicles.tractor, tractor.park) < 0.1)
  assert.deepEqual(state.practice, { pickup: 0, tractor: 0 })
})

test('walking crew stop at a parked learner vehicle instead of passing through it', (t) => {
  const start = offset(tractor.park, -3.5, tractor.spec.centerZ)
  const { join, hold } = setup(t, { players: [player(0, start)] })
  const walker = join(tokens[0])
  hold(walker, 60, { x: 1, z: 0 })
  const local = walker.player.x - tractor.park.x
  assert.ok(local < -tractor.spec.width / 2, `The walker stopped at x ${local.toFixed(2)} beside the tractor`)
})

test('each learner vehicle drives on its own tuning, the tractor at a walking-pace top speed', (t) => {
  const { join, hold } = setup(t, {
    players: [player(0, pickup.park, { seat: 'driver', vehicle: 'pickup' }), player(1, tractor.park, { seat: 'driver', vehicle: 'tractor' })],
  })
  const pickupDriver = join(tokens[0])
  const tractorDriver = join(tokens[1])
  // Three seconds of throttle; each pair of holds advances two ticks.
  for (let i = 0; i < 45; i++) {
    hold(pickupDriver, 1, { z: 1 })
    hold(tractorDriver, 1, { z: 1 })
  }
  const { vehicles, truck } = pickupDriver.state
  assert.ok(distance(vehicles.pickup, pickup.park) > 8, 'The pickup pulled away')
  assert.ok(distance(vehicles.tractor, tractor.park) > 4, 'The tractor pulled away')
  assert.ok(vehicles.tractor.speed <= tractor.drive.engine.forwardSpeed + 0.2)
  assert.ok(vehicles.pickup.speed > vehicles.tractor.speed)
  assert.ok(Math.abs(truck.speed) < 0.1, 'The parked flatbed ignores learner drivers')
})

test('a save file keeps learner seats and XP, and rejects a seat the vehicle does not have', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-learner-save-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const save = createGame().snapshotForSave()
  const seated = (overrides) => ({ token: tokens[0], player: player(0, pickup.park, overrides), reserved: true })
  save.crew = [seated({ seat: 'driver', vehicle: 'pickup', drivingXp: { rescue: 20 } })]
  file.write(save)
  assert.deepEqual(file.load().crew[0].player.drivingXp, { rescue: 20 })
  for (const bad of [{ seat: 'passenger', vehicle: 'tractor' }, { seat: null, vehicle: 'pickup' }, { drivingXp: { toString: 5 } }]) {
    save.crew = [seated(bad)]
    file.write(save)
    assert.throws(() => file.load(), /Could not load island save/, JSON.stringify(bad))
  }
})
