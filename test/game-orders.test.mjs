import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { actionHint } from '../src/actions.ts'
import { market } from '../src/farm.ts'
import { jobBoard, jobs, secondIslandGoal } from '../src/jobs.ts'
import { groundHeight } from '../src/terrain.ts'
import { jobPay, lookout, skiffStart, town } from '../src/world.ts'
import { tokens, player, setup, door } from './support/game-harness.mjs'

test('delivering all crates and spraying the fire unlocks repeatable jobs without resetting the island', (t) => {
  const h = setup(t, {
    players: [player(0, town), player(1, { x: lookout.x + 2, z: lookout.z + 1 })],
    arrange: (save) => {
      save.world.items.slice(0, 3).forEach((item, i) => void Object.assign(item, { ...town, x: town.x - 1 + i, y: 0.46 }))
      Object.assign(save.world.items[3], { x: lookout.x + 1, z: lookout.z + 1 })
    },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  b.request('interact')
  h.advance()
  assert.equal(b.state.items[3].holder, null)
  for (let i = 0; i < 3; i++) {
    a.request('interact')
    h.advance()
    assert.equal(a.state.items.some(({ holder }) => holder === 0), true)
    a.request('interact')
    h.advance()
  }
  assert.equal(b.state.mission, 'fire')
  assert.equal(b.state.crewCoins, jobPay.crate * 3 + jobPay.delivery)
  b.request('interact')
  h.advance()
  assert.match(actionHint(b.state, b.player)[1], /spray/)
  b.request('primary', { phase: 'start' })
  h.hold(b, 170)
  assert.equal(a.state.mission, 'complete')
  assert.equal(a.state.fire, 0)
  assert.equal(a.state.crewCoins, jobPay.crate * 3 + jobPay.delivery + jobPay.fire)
  assert.equal(b.state.crewCoins, a.state.crewCoins)
  assert.equal(a.state.lastStarterPay, 'fire')
  assert.equal(b.state.lastStarterPay, 'fire')
  assert.equal(a.state.items[3].holder, null)
  const before = a.player
  a.request('reset')
  h.advance()
  assert.equal(b.state.mission, 'complete')
  assert.deepEqual(a.player, before)
})

test('a solo delivery credits the bank while a crewmate is offline across a host restart', (t) => {
  const h = setup(t, {
    players: [player(0, town), player(1)],
    arrange(save) {
      save.world.items[0].holder = 0
      Object.assign(save.world.items[1], { x: town.x + 1.1, z: town.z, y: 0.5 })
      Object.assign(save.world.items[2], { x: town.x - 1.1, z: town.z, y: 0.5 })
    },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('interact')
  h.advance()
  assert.equal(b.state.crewCoins, jobPay.crate)
  assert.equal(a.state.lastStarterPay, 'crate')
  assert.equal(b.state.lastStarterPay, 'crate')
  b.close()
  h.elapse(12_100)
  assert.equal(h.game.snapshotForSave().crew[1].reserved, false)
  const resumed = setup(t, { saved: h.game.snapshotForSave() })
  const driver = resumed.join(tokens[0])
  for (let i = 0; i < 2; i++) {
    driver.request('interact')
    resumed.advance()
    driver.request('interact')
    resumed.advance()
  }
  assert.equal(driver.state.mission, 'fire')
  assert.equal(resumed.game.snapshotForSave().crewCoins, 3 * jobPay.crate + jobPay.delivery)
  const returning = resumed.join(tokens[1])
  assert.equal(returning.state.crewCoins, driver.state.crewCoins)
  assert.equal(returning.state.lastStarterPay, 'delivery')
})

test('an older completed shift pools legacy wallets and keeps its order and farm on rejoining', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-bank-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const save = createGame().snapshotForSave()
  Object.assign(save.world, { mission: 'complete', fire: 0, jobs: { active: { id: 'market-carrots', progress: 1 }, completed: 2 } })
  save.world.farm[0] = 'watered'
  save.version = 1
  delete save.crewCoins
  save.crew = [13, 9].map((coins, id) => ({
    token: tokens[id],
    player: player(id, door(id), { coins, starterSeedClaimed: true, lastStarterPay: id === 0 ? 'delivery' : 'fire' }),
    reserved: id === 0,
  }))
  file.write(save)
  const h = setup(t, { saved: file.load() })
  const returning = tokens.slice(0, 2).map(h.join)
  for (const client of returning) {
    client.request('interact')
    h.advance()
    assert.deepEqual(client.messages.at(-1), { type: 'crew-note' })
    assert.equal(client.state.crewCoins, 22)
    assert.equal(client.state.lastStarterPay, 'fire')
    assert.deepEqual(client.state.jobs, save.world.jobs)
    assert.equal(client.state.farm[0], 'watered')
  }
  returning[1].close()
  h.elapse(12_100)
  const newcomer = h.join(tokens[2])
  assert.deepEqual(actionHint(newcomer.state, newcomer.player), ['E', 'Take tools and a carrot seed'])
  assert.equal(newcomer.state.crewCoins, 22)
  file.write(h.game.snapshotForSave())
  const migrated = file.load()
  assert.equal(migrated.version, 7)
  assert.equal(migrated.lastStarterPay, 'fire')
  assert.ok(migrated.crew.every(({ player }) => !('coins' in player)))
  assert.equal(createGame({ save: migrated }).crewCoins, 22)
  assert.deepEqual(newcomer.state.jobs, save.world.jobs)
})

test('the harbor board offers a new cargo and destination without moving either crew member or vehicle', (t) => {
  const h = setup(t, {
    players: [player(0, jobBoard), player(1, skiffStart, { seat: 'port' })],
    arrange(save) {
      save.world.mission = 'complete'
      save.world.truck = { x: 21, z: -8, heading: 0 }
      save.world.farm[1] = 'planted'
    },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  const before = a.state
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Open the harbor job board'])
  b.request('take-job', { id: 'beach-gear' })
  a.request('take-job', { id: 'constructor' })
  h.advance()
  assert.equal(a.state.jobs.active, null)
  assert.ok(b.messages.some(({ type }) => type === 'order-unavailable'))
  a.request('take-job', { id: 'farm-supplies' })
  a.request('take-job', { id: 'beach-gear' })
  h.advance()
  assert.deepEqual(b.state.jobs.active, { id: 'farm-supplies', progress: 0 })
  assert.equal(b.player.seat, 'port')
  assert.equal(a.player.x, before.players[0].x)
  assert.deepEqual(a.state.skiff, before.skiff)
  assert.ok(Math.abs(a.state.truck.x - before.truck.x) < 0.05)
  assert.equal(a.state.farm[1], 'planted')
  assert.equal(a.state.items.filter(({ kind, delivered }) => kind === 'crate' && !delivered).length, 2)
  const saved = h.game.snapshotForSave()
  const job = jobs['farm-supplies']
  saved.crew[0].player = player(0, town)
  saved.world.items[0].holder = 0
  const wrongDrop = setup(t, { saved })
  const dropping = wrongDrop.join(tokens[0])
  dropping.request('interact')
  wrongDrop.advance()
  assert.equal(dropping.state.jobs.active.progress, 0)
  assert.equal(dropping.state.items[0].delivered, false)

  saved.crew[0].player = player(0, job.drop)
  Object.assign(saved.world.items[1], { ...job.drop, x: job.drop.x + 1, y: 0.5 })
  const nearFarm = setup(t, { saved })
  const delivery = nearFarm.join(tokens[0])
  assert.deepEqual(actionHint(delivery.state, delivery.player), ['E', 'Deliver crate'])
  for (let i = 0; i < 3; i++) {
    delivery.request('interact')
    nearFarm.advance()
  }
  assert.deepEqual(delivery.state.jobs, { active: null, completed: 1 })
  assert.equal(delivery.state.mission, 'complete')
  assert.equal(delivery.state.crewCoins, job.coins)
  assert.equal(nearFarm.join(tokens[1]).state.crewCoins, job.coins)
})

test('market orders can be filled by both players, survive a reload, and count toward the second island', (t) => {
  const h = setup(t, {
    players: [player(0, jobBoard, { goods: { fish: 2, carrots: 1 } }), player(1, market, { goods: { fish: 1, carrots: 0 } })],
    arrange(save) {
      save.world.mission = 'complete'
      save.world.jobs.completed = secondIslandGoal - 1
    },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('take-job', { id: 'market-fish' })
  h.advance()
  assert.match(actionHint(b.state, b.player)[1], /Contribute 1 fish/)
  b.request('interact')
  h.advance()
  assert.equal(a.state.jobs.active.progress, 1)
  assert.equal(b.state.crewCoins, 0)
  const saved = h.game.snapshotForSave()
  Object.assign(saved.crew[0].player, market, { y: groundHeight(market) })
  const resumed = setup(t, { saved })
  const seller = resumed.join(tokens[0])
  assert.deepEqual(seller.state.jobs.active, { id: 'market-fish', progress: 1 })
  resumed.checkpoint.mock.resetCalls()
  seller.request('interact')
  const checkpoint = resumed.checkpoint.mock.calls[0]?.result
  assert.deepEqual(checkpoint?.world.jobs, { active: null, completed: secondIslandGoal })
  assert.equal(checkpoint.crewCoins, jobs['market-fish'].coins)
  resumed.advance()
  assert.deepEqual(seller.player.goods, { fish: 1, carrots: 1 })
  assert.equal(seller.state.crewCoins, jobs['market-fish'].coins)
  assert.deepEqual(seller.state.jobs, { active: null, completed: secondIslandGoal })
  const teammate = resumed.join(tokens[1])
  assert.equal(teammate.state.crewCoins, seller.state.crewCoins)
  seller.request('buy-seed')
  seller.request('interact')
  resumed.advance()
  assert.equal(seller.player.seeds, 1)
  assert.equal(seller.state.crewCoins, jobs['market-fish'].coins - 1 + 5)
  assert.equal(seller.state.jobs.completed, secondIslandGoal)
})
