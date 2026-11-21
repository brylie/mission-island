import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame } from '../server/game.ts'
import { haulerUnlockXp, dispatchBay, emptyTicket, hopperBay, oreContracts } from '../src/ore-contracts.ts'
import { advanceHauler } from '../src/simulation/ore-truck.ts'
import { offset, truckStart, town } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

test('a driver with 90 XP earns certification when a crewmate delivers the next crate they drove', t => {
  const start = offset(truckStart, 2.2, -1.5)
  const h = setup(t, { players: [player(0, start, { deliveryXp: 90 }), player(1, town)], arrange(save) {
    save.world.items[0].holder = 0
  } })
  const driver = h.join(tokens[0])
  driver.request('interact')
  h.advance(30)
  assert.equal(driver.state.items[0].onBed, true)
  driver.request('seat')
  h.advance()
  h.hold(driver, 105, { z: 1, careful: true })
  assert.equal(driver.player.seat, 'driver')
  assert.deepEqual(h.game.freight.status(tokens[0]), { boarded: false, xp: 90, ticket: emptyTicket() })
  const accept = { action: 'accept', choice: 'ballast', revision: 0 }
  assert.match(h.game.freight.act(tokens[0], accept), /100 driver XP/)
  const saved = h.game.snapshotForSave()
  assert.equal(saved.crew[0].player.drivenCrates[0], 8)
  // Resume at the handoff with the other crewmate holding the driven crate.
  saved.world.items[0].holder = 1
  const restored = setup(t, { saved })
  const helper = restored.join(tokens[1])
  helper.request('interact')
  restored.advance()
  assert.equal(helper.state.items[0].delivered, true)
  assert.equal(restored.game.freight.status(tokens[0]).xp, 100)
  assert.equal(restored.game.freight.act(tokens[0], { action: 'board', revision: 0 }), undefined)
  assert.equal(restored.game.freight.act(tokens[0], { ...accept, revision: 1 }), undefined)
  assert.equal(restored.game.freight.status(tokens[1]).xp, 0)
  assert.equal(restored.game.snapshotForSave().crew[0].player.drivenCrates[0], 0)
})

// Exercise the same steering, braking, and input batches used by a driver.
function driveTo(pose, goal, loaded, send) {
  const batch = []
  function step(throttle, steer, brake) {
    const input = { throttle, steer, brake, dt: .05 }
    advanceHauler(pose, input, loaded)
    batch.push(input)
    if (batch.length === 8) send(batch.splice(0))
  }
  let ticks = 0
  while (Math.hypot(goal.x - pose.x, goal.z - pose.z) > 2.2) {
    assert.ok(++ticks < 6000, 'truck reaches the next bay')
    const turn = Math.atan2(goal.x - pose.x, goal.z - pose.z) - pose.heading
    const angle = Math.atan2(Math.sin(turn), Math.cos(turn))
    step(pose.speed < 5 ? 1 : 0, Math.abs(angle) < .025 ? 0 : Math.sign(angle), false)
  }
  while (pose.speed) step(0, 0, true)
  if (batch.length) send(batch)
}

test('six contracts use the boarded truck’s driven position and pay only once across a host restart', () => {
  for (const order of oreContracts) {
    let now = 1000
    const save = createGame().snapshotForSave()
    save.crew = [{ token: tokens[0], player: player(0, undefined, { deliveryXp: haulerUnlockXp }), reserved: false }]
    let game = createGame({ save, clock: () => now })
    const ticket = () => game.freight.status(tokens[0]).ticket
    const act = cmd => game.freight.act(tokens[0], { revision: ticket().revision, ...cmd })
    const accept = { action: 'accept', choice: order.id }
    assert.match(act(accept), /Board/)
    assert.equal(act({ action: 'board' }), undefined)
    assert.equal(act(accept), undefined)
    const load = { action: 'load', choice: order.ore }
    assert.match(act(load), /hopper/)
    const pose = { ...dispatchBay, heading: Math.PI / 2, speed: 0 }
    const send = steps => {
      now += steps.length * 50
      assert.equal(act({ action: 'drive', steps }), undefined)
      assert.deepEqual(ticket().truck, { x: pose.x, z: pose.z, heading: pose.heading })
    }
    driveTo(pose, hopperBay, false, send)
    assert.match(act({ ...load, choice: 'unsorted' }), /does not match/)
    assert.equal(act(load), undefined)
    const deliver = { action: 'deliver' }
    game = createGame({ save: game.snapshotForSave(), clock: () => now })
    assert.equal(game.freight.status(tokens[0]).boarded, false)
    assert.equal(ticket().loaded, true)
    assert.match(act(deliver), /Board/)
    assert.equal(act({ action: 'board' }), undefined)
    now += 120000
    assert.match(act(deliver), /buyer/)
    driveTo(pose, order.buyer, true, send)
    assert.equal(act({ action: 'leave' }), undefined)
    assert.match(act(deliver), /Board/)
    assert.equal(act({ action: 'board' }), undefined)
    const revision = ticket().revision
    assert.equal(act(deliver), undefined)
    assert.match(act({ ...deliver, revision }), /changed/)
    assert.equal(game.crewCoins, order.coins)
    assert.equal(ticket().contract, null)
    assert.match(act(accept), /bay/)
  }
})

test('host clock bounds input batches and an old batch cannot advance the truck twice', () => {
  let now = 1000
  const save = createGame().snapshotForSave()
  save.crew = [{ token: tokens[0], player: player(0, undefined, { deliveryXp: haulerUnlockXp }), reserved: false }]
  const { freight } = createGame({ save, clock: () => now })
  const act = command => freight.act(tokens[0], command)
  assert.equal(act({ action: 'board', revision: 0 }), undefined)
  const batch = { action: 'drive', revision: 1, steps: Array(10).fill({ throttle: 1, steer: 0, brake: false, dt: .05 }) }
  assert.match(act(batch), /clock/)
  now += 500
  assert.equal(act(batch), undefined)
  assert.match(act(batch), /changed/)
  assert.match(act({ action: 'leave', revision: 2 }), /Stop/)
})

test('unloaded driving and hand deliveries leave the ore truck locked', t => {
  const h = setup(t, { players: [player(0, offset(truckStart, 2.1, .8)), player(1, town)], arrange(save) {
    save.world.items[0].holder = 1
  } })
  const driver = h.join(tokens[0]), helper = h.join(tokens[1])
  driver.request('seat')
  h.hold(driver, 95, { z: 1 })
  helper.request('interact')
  h.advance()
  assert.equal(helper.state.items[0].delivered, true)
  assert.equal(h.game.freight.status(tokens[0]).xp, 0)
  assert.equal(h.game.freight.status(tokens[1]).xp, 0)
  assert.deepEqual(h.game.freight.status(''), { boarded: false, xp: 0, ticket: emptyTicket() })
})
