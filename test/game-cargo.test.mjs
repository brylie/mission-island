import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame } from '../server/game.ts'
import { createSocketSessions } from '../server/socket-sessions.ts'
import { actionHint } from '../src/actions.ts'
import { groundHeight, grove } from '../src/terrain.ts'
import { offset, truckStart } from '../src/world.ts'
import { tokens, GameClient, player, setup } from './support/game-harness.mjs'

test('short throws use physical cargo and the truck keeps it when the crew boards', (t) => {
  const h = setup(t, {
    players: [player(0, offset(truckStart, 0, -4.8)), player(1, offset(truckStart, 2.1, 0.9))],
    arrange: (save) => { save.world.items[0].holder = 0 },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('seat')
  h.advance()
  assert.equal(a.player.seat, null)
  a.request('primary', { phase: 'start' })
  h.advance()
  assert.ok(a.player.charge.power < 0.1)
  a.request('primary', { phase: 'cancel' })
  h.advance()
  assert.equal(b.state.items[0].holder, 0)
  h.click(a, truckStart.heading)
  h.advance(90)
  assert.equal(b.state.items[0].onBed, true)
  b.request('seat')
  h.advance()
  assert.equal(b.player.seat, 'driver')
  h.hold(b, 45, { z: 1, careful: true })
  assert.ok(b.state.truck.x > truckStart.x)
  assert.equal(a.state.items[0].onBed, true)
  assert.deepEqual(actionHint(b.state, b.player), ['Space', 'Brake to exit truck'])
  h.hold(b, 30, { brake: true })
  assert.equal(a.state.truck.braking, true)
  assert.equal(b.state.truck.speed, 0)
  b.request('seat')
  h.advance()
  assert.equal(b.player.seat, null)
})

test('the driver and passenger share hilly suspension and only the driver operates the brake', (t) => {
  const start = { x: -19, z: 11, heading: 0 }
  const h = setup(t, {
    players: [player(0, offset(start, -2.1, 0)), player(1, offset(start, 2.1, 0))],
    arrange: (save) => { save.world.truck = start },
  })
  const driver = h.join(tokens[0])
  const passenger = h.join(tokens[1])
  driver.request('seat')
  passenger.request('seat')
  h.advance()
  assert.equal(driver.player.seat, 'driver')
  assert.equal(passenger.player.seat, 'passenger')
  h.input(passenger, { brake: true })
  h.hold(driver, 45, { z: 1, careful: true })
  const climbing = driver.state.truck
  assert.ok(climbing.z > start.z + 2.5 && climbing.y > 0.5 && climbing.speed > 3)
  assert.ok(climbing.pitch < -0.12 && Math.abs(climbing.roll) > 0.05)
  assert.ok(Math.max(...climbing.suspension) - Math.min(...climbing.suspension) > 0.02)
  assert.equal(climbing.braking, false)
  assert.deepEqual(passenger.state.truck, climbing)
  assert.deepEqual(actionHint(passenger.state, passenger.player), ['', 'Wait for the truck to stop'])
  h.hold(driver, 30, { z: 1, brake: true })
  const stopped = passenger.state.truck
  assert.equal(stopped.braking, true)
  assert.equal(stopped.speed, 0)
  assert.deepEqual(actionHint(driver.state, driver.player), ['F', 'Exit truck'])
  assert.ok(stopped.z - climbing.z < 1.8)
  h.hold(driver, 60)
  assert.equal(passenger.state.truck.z, stopped.z)
  assert.equal(passenger.state.truck.braking, false)
  h.hold(driver, 26, { z: -1, x: 1 })
  const reversing = passenger.state.truck
  assert.ok(reversing.speed < -1 && reversing.z < stopped.z - 0.6)
  assert.ok(reversing.steering > 0.2 && reversing.heading < stopped.heading - 0.05)
  h.hold(driver, 1, { z: 1 })
  assert.equal(passenger.state.truck.braking, true)
})

test('a crate loaded on a sloping deck stays aboard after the host reloads the save', (t) => {
  const start = { x: -19, z: 14.75, heading: 0 }
  const h = setup(t, {
    players: [player(0, offset(start, 2.2, -1.5))],
    arrange(save) {
      save.world.truck = start
      save.world.items[0].holder = 0
    },
  })
  const client = h.join(tokens[0])
  client.request('interact')
  h.advance(45)
  assert.equal(client.state.items[0].onBed, true)
  assert.equal(client.state.items[0].holder, null)
  const saved = h.game.snapshotForSave()
  const game = createGame({ save: saved })
  const reconnected = new GameClient()
  t.after(() => reconnected.close())
  const sessions = createSocketSessions(game)
  sessions.connect(reconnected)
  reconnected.request('join', { token: tokens[0] })
  for (let i = 0; i < 30; i++) sessions.tick()
  assert.equal(reconnected.state.items[0].onBed, true)
  assert.ok(Math.abs(reconnected.state.truck.z - saved.world.truck.z) < 0.15)
})

test('an extinguisher left by an expired crew member stays reachable on a hill', (t) => {
  const h = setup(t, {
    players: [player(0, grove)],
    arrange(save) {
      save.world.mission = 'fire'
      save.world.items[3].holder = 0
    },
  })
  const disconnected = h.join(tokens[0])
  disconnected.close()
  h.elapse(12_100)
  const returning = h.join(tokens[0])
  const tool = returning.state.items[3]
  assert.equal(tool.holder, null)
  assert.ok(tool.y > 2.1)
  assert.equal(tool.y, groundHeight(tool) + 0.04)
  returning.request('interact')
  h.advance()
  assert.equal(returning.state.items[3].holder, 0)
})
