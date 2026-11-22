import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { actionHint } from '../src/actions.ts'
import { farmOrderStatus } from '../src/farm-orders.ts'
import { market } from '../src/farm.ts'
import { interactions } from '../src/interaction-options.ts'
import { groundHeight } from '../src/terrain.ts'
import { daySeconds } from '../src/weather.ts'
import { barrowPickup, produceCounter } from '../src/worlds/starter/farm-order-sites.ts'
import { distance } from '../src/world.ts'
import { door, player, setup, tokens } from './support/game-harness.mjs'

function act(client, action) {
  client.request('interact', { choice: { action } })
}

function place(save, id, point) {
  Object.assign(save.crew[id].player, point, { y: groundHeight(point) })
}

const goods = (carrots, fish = 0) => ({ goods: { carrots, fish } })
const farmPay = (client) => client.messages.filter(({ type }) => type === 'farm-pay')

test('Ines’s first order survives a skipped night and restart, then pays and qualifies once', (t) => {
  const h = setup(t, {
    players: [player(0, produceCounter, goods(1)), player(1, produceCounter, goods(2, 1))],
    arrange(save) { delete save.world.produce },
  })
  const a = h.join(tokens[0])
  assert.match(actionHint(a.state, a.player)[1], /2 carrots to Seabrook Market · 8 coins/)
  a.request('appearance', { appearance: { uniform: 'farmer' } })
  act(a, 'accept-produce')
  act(a, 'deliver-produce')
  h.advance()
  assert.equal(a.player.appearance.uniform, 'default')
  assert.equal(a.state.farmWork.progress.delivered, 1)
  assert.equal(a.state.crewCoins, 0)
  const late = h.join(tokens[1])
  assert.match(farmOrderStatus(late.state.farmWork), /still needs 1 carrot at Seabrook Market/)
  assert.equal(late.player.goods.carrots, 2)

  const night = h.game.snapshotForSave()
  night.crew[0].player.goods.carrots = 2
  night.islandTime = daySeconds * 0.73
  place(night, 0, door(0))
  place(night, 1, door(1))
  const bedtime = setup(t, { saved: night })
  act(bedtime.join(tokens[0]), 'sleep')
  act(bedtime.join(tokens[1]), 'sleep')
  bedtime.advance()
  const dawn = bedtime.game.snapshotForSave()
  assert.equal(dawn.islandTime, daySeconds)
  assert.equal(dawn.world.produce.delivered, 1)
  place(dawn, 0, produceCounter)
  place(dawn, 1, produceCounter)

  const resumed = setup(t, { saved: dawn })
  const first = resumed.join(tokens[0])
  const second = resumed.join(tokens[1])
  act(first, 'deliver-produce')
  act(second, 'deliver-produce')
  resumed.advance()
  assert.equal(first.state.crewCoins, 8)
  assert.equal(second.state.crewCoins, 8)
  assert.equal(first.player.goods.carrots, 1)
  assert.deepEqual(second.player.goods, { carrots: 2, fish: 1 })
  assert.deepEqual(first.state.farmWork.progress, { stage: 'qualified', delivered: 0, load: 0 })
  assert.deepEqual(first.state.farmWork.barrow, { ...barrowPickup, handler: null })
  assert.deepEqual(farmPay(first), [{ type: 'farm-pay', id: 'starter', coins: 8 }])
  assert.deepEqual(farmPay(second), farmPay(first))
  assert.equal(first.state.jobs.completed, 0)
  assert.equal(first.state.residents.ines.trust, 0)
  first.request('appearance', { appearance: { uniform: 'farmer' } })
  resumed.advance()
  assert.equal(first.player.appearance.uniform, 'farmer')
  assert.notEqual(second.player.appearance?.uniform, 'farmer')
})

test('both players pack and recover one loaded barrow, and only its handler can unload it', (t) => {
  const h = setup(t, {
    players: [player(0, barrowPickup, goods(2)), player(1, barrowPickup, goods(4))],
    arrange(save) { save.world.produce = { stage: 'harvest', delivered: 0, load: 0 } },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  act(a, 'grip-barrow')
  act(b, 'grip-barrow')
  act(a, 'pack-barrow')
  act(b, 'pack-barrow')
  h.advance()
  assert.equal(a.state.farmWork.barrow.handler, 0)
  assert.equal(b.state.farmWork.progress.load, 6)
  assert.equal(a.player.goods.carrots + b.player.goods.carrots, 0)
  h.hold(a, 12, { x: 1 })
  assert.ok(distance(a.state.farmWork.barrow, barrowPickup) > 1)
  a.close()
  h.advance()
  assert.deepEqual(b.state.farmWork.barrow, { ...barrowPickup, handler: null })
  assert.equal(b.state.farmWork.progress.load, 6)
  assert.ok(b.messages.some(({ type }) => type === 'barrow-returned'))
  act(b, 'grip-barrow')
  h.hold(b, 12, { x: 1 })
  const saved = h.game.snapshotForSave()
  place(saved, 0, produceCounter)
  const restart = setup(t, { saved })
  const driver = restart.join(tokens[1])
  assert.deepEqual(driver.state.farmWork.barrow, { ...barrowPickup, handler: null })
  assert.equal(driver.state.farmWork.progress.load, 6)
  restart.hold(driver, 10, { x: -1 })
  act(driver, 'grip-barrow')
  restart.advance()
  assert.equal(driver.state.farmWork.barrow.handler, 1)
  // Follow the actual west-side approach to the market building.
  for (const [point, input] of [
    [{ x: 33, z: -8 }, { x: 1 }],
    [{ x: 33, z: 8 }, { z: 1 }],
    [produceCounter, { x: 1 }],
  ]) {
    const axis = input.x ? 'x' : 'z'
    for (let i = 0; i < 330 && driver.player[axis] < point[axis] - 0.2; i++) restart.hold(driver, 1, input)
    assert.ok(driver.player[axis] >= point[axis] - 0.2, JSON.stringify(driver.player))
    assert.equal(driver.state.farmWork.barrow.handler, 1, JSON.stringify({ point, barrow: driver.state.farmWork.barrow }))
  }
  const teammate = restart.join(tokens[0])
  assert.ok(distance(teammate.player, driver.state.farmWork.barrow) < 2)
  // An old request from the previous handler cannot unload this haul.
  act(teammate, 'unload-barrow')
  restart.advance()
  assert.equal(driver.state.farmWork.progress.load, 6)
  act(driver, 'unload-barrow')
  act(driver, 'unload-barrow')
  restart.advance()
  assert.equal(driver.state.farmWork.progress.stage, 'complete')
  assert.equal(driver.state.crewCoins, 22)
  assert.deepEqual(farmPay(driver), [{ type: 'farm-pay', id: 'harvest', coins: 22 }])
})

test('produce work leaves the regular market, board, and Ines’s fish favor available', (t) => {
  const h = setup(t, {
    players: [player(0, market, goods(1, 1)), player(1, produceCounter, goods(2))],
    arrange(save) {
      save.world.mission = 'complete'
      save.world.jobs = { active: { id: 'market-carrots', progress: 0 }, completed: 1 }
      save.world.residents.ines.active = 'ines-display'
    },
  })
  const seller = h.join(tokens[0])
  const buyer = h.join(tokens[1])
  act(buyer, 'accept-produce')
  act(buyer, 'deliver-produce')
  act(seller, 'market')
  h.advance()
  assert.equal(seller.state.jobs.active.progress, 1)
  assert.equal(seller.state.jobs.completed, 1)
  assert.equal(seller.state.residents.ines.active, 'ines-display')
  assert.equal(seller.player.goods.fish, 1)
  assert.equal(buyer.state.crewCoins, 8)
  act(buyer, 'accept-barrow-order')
  h.advance()
  assert.equal(buyer.state.farmWork.progress.stage, 'harvest')
})

test('setting down the barrow uses a fixed prompt while its handler moves', (t) => {
  const h = setup(t, {
    players: [player(0, barrowPickup)],
    arrange(save) { save.world.produce = { stage: 'harvest', delivered: 0, load: 6 } },
  })
  const handler = h.join(tokens[0])
  act(handler, 'grip-barrow')
  h.hold(handler, 12, { x: 1 })
  assert.ok(distance(handler.state.farmWork.barrow, barrowPickup) > 1)
  for (const grounded of [true, false]) {
    const walking = { ...handler.player, grounded }
    const [park] = interactions(handler.state, walking)
    assert.equal(park.action, 'park-barrow')
    assert.equal(park.at, undefined)
    assert.deepEqual(actionHint(handler.state, walking), ['E', 'Set down the barrow'])
  }
  act(handler, 'park-barrow')
  h.advance()
  assert.equal(handler.state.farmWork.barrow.handler, null)
  assert.equal(handler.state.farmWork.progress.load, 6)
})

test('the parked barrow blocks walkers and the loaded barrow stops at farm props', (t) => {
  const h = setup(t, {
    players: [player(0, { x: 25.6, z: -8 }), player(1, { x: 28.8, z: -7 })],
    arrange(save) { save.world.produce = { stage: 'harvest', delivered: 0, load: 6 } },
  })
  const walker = h.join(tokens[0])
  const handler = h.join(tokens[1])
  h.hold(walker, 28, { x: 1 })
  assert.ok(walker.player.x > 27 && walker.player.x < barrowPickup.x - 0.5)
  act(handler, 'grip-barrow')
  h.hold(handler, 54, { z: -1 })
  const stoppedAt = handler.player.z
  const cart = handler.state.farmWork.barrow
  assert.ok(stoppedAt < -7.5 && stoppedAt > -9.5)
  assert.equal(cart.handler, handler.player.id)
  h.hold(handler, 24, { z: -1 })
  assert.equal(handler.player.z, stoppedAt)
  assert.deepEqual(handler.state.farmWork.barrow, cart)
  act(handler, 'park-barrow')
  h.advance()
  assert.equal(handler.state.farmWork.barrow.handler, null)
  assert.equal(handler.state.farmWork.progress.load, 6)
})

test('disk saves preserve barrow and materials progress and reject impossible crop totals', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'farm-orders-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const h = setup(t, {
    players: [player(0, barrowPickup, goods(2))],
    arrange(save) {
      save.world.produce = { stage: 'harvest', delivered: 1, load: 2 }
      save.world.materialsWork.readyAt.timber = 2
    },
  })
  const a = h.join(tokens[0])
  act(a, 'pack-barrow')
  act(a, 'grip-barrow')
  h.advance()
  const save = h.game.snapshotForSave()
  file.write(save)
  const world = createGame({ save: file.load() }).tick()
  assert.deepEqual(world.farmWork, {
    progress: { stage: 'harvest', delivered: 1, load: 4 },
    barrow: { ...barrowPickup, handler: null },
  })
  assert.equal(world.materialsWork.readyAt.timber, 2)
  assert.equal(world.crewCoins, 0)
  save.world.produce.load = 6
  file.write(save)
  assert.throws(() => file.load(), /Could not load island save/)
})
