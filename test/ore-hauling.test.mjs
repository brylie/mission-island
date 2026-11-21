import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame } from '../server/game.ts'
import { crateDriverXp, haulerUnlockXp, dispatchBay, emptyTicket, hopperBay, oreContracts } from '../src/ore-contracts.ts'
import { offset, truckStart, town } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

test('driving loaded freight earns personal XP only when a crewmate delivers that crate', t => {
  const start = offset(truckStart, 2.2, -1.5)
  const h = setup(t, { players: [player(0, start), player(1, town)], arrange(save) {
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
  assert.deepEqual(h.game.freight.status(tokens[0]), { xp: 0, ticket: emptyTicket() })
  const saved = h.game.snapshotForSave()
  assert.equal(saved.crew[0].player.drivenCrates[0], 8)
  // Resume at the handoff with the other crewmate holding the driven crate.
  saved.world.items[0].holder = 1
  const restored = setup(t, { saved })
  const helper = restored.join(tokens[1])
  helper.request('interact')
  restored.advance()
  assert.equal(helper.state.items[0].delivered, true)
  assert.equal(restored.game.freight.status(tokens[0]).xp, crateDriverXp)
  assert.equal(restored.game.freight.status(tokens[1]).xp, 0)
  assert.equal(restored.game.snapshotForSave().crew[0].player.drivenCrates[0], 0)
})

test('every contract requires XP, a matching hopper load, transit and the named buyer, then pays exactly once', () => {
  for (const order of oreContracts) {
    let now = 1000
    const save = createGame().snapshotForSave()
    save.crew = [0, 1].map(i => ({ token: tokens[i], player: player(i, undefined, i ? {} : { deliveryXp: haulerUnlockXp }), reserved: false }))
    let game = createGame({ save, clock: () => now })
    const command = (action, point, choice, revision) => ({ action, ...point, choice, revision })
    const accept = command('accept', dispatchBay, order.id, 0)
    assert.match(game.freight.act(tokens[1], accept), /XP/)
    const act = command => game.freight.act(tokens[0], command)
    assert.match(act({ ...accept, ...hopperBay }), /bay/)
    assert.equal(act(accept), undefined)
    const load = command('load', hopperBay, order.ore, 1)
    assert.match(act({ ...load, ...dispatchBay }), /hopper/)
    assert.match(act({ ...load, choice: 'unsorted' }), /does not match/)
    const deliver = command('deliver', order.buyer, '', 2)
    assert.match(act({ ...deliver, revision: 1 }), /loaded/)
    assert.equal(act(load), undefined)
    assert.match(act(load), /changed/)
    game = createGame({ save: game.snapshotForSave(), clock: () => now })
    assert.equal(game.freight.status(tokens[0]).ticket.loaded, true)
    assert.match(act(deliver), /transit/)
    now += 120000
    assert.match(act({ ...deliver, ...dispatchBay }), /buyer/)
    assert.equal(act(deliver), undefined)
    assert.match(act(deliver), /changed/)
    assert.equal(game.crewCoins, order.coins)
    assert.deepEqual(game.freight.status(tokens[0]).ticket, { ...emptyTicket(), revision: 3 })
    assert.equal(act({ ...accept, revision: 3 }), undefined)
  }
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
  assert.deepEqual(h.game.freight.status(''), { xp: 0, ticket: emptyTicket() })
})
