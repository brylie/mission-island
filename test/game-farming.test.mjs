import assert from 'node:assert/strict'
import { test } from 'node:test'
import { actionHint } from '../src/actions.ts'
import { farmPlots, market, saleValue } from '../src/farm.ts'
import { marketRunoffAt } from '../src/market-runoff.ts'
import { daySeconds } from '../src/weather.ts'
import { tokens, player, setup } from './support/game-harness.mjs'

test('markets sell only owned goods, consume coins for seeds and protect locked uniforms', (t) => {
  const h = setup(t, { players: [player(0, market, { goods: { fish: 2, carrots: 1 } }), player(1)] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.match(actionHint(a.state, a.player)[1], /Sell for 7/)
  a.request('buy-seed')
  a.request('interact')
  a.request('interact')
  b.request('buy-seed')
  a.request('buy-seed')
  a.request('buy-angler')
  a.request('buy-angler')
  a.request('appearance', { appearance: { uniform: 'angler', skin: 12 } })
  h.advance()
  assert.deepEqual(a.player.goods, { fish: 0, carrots: 0 })
  assert.equal(a.state.crewCoins, 3)
  assert.equal(b.state.crewCoins, 3)
  assert.deepEqual(b.messages.filter(({ type }) => type === 'market-sale'), [{ type: 'market-sale', coins: 7 }])
  assert.equal(a.player.seeds, 1)
  assert.equal(b.player.seeds, 0)
  assert.equal(a.player.appearance.uniform, 'angler')
  assert.equal(a.messages.filter(({ type }) => type === 'market-sale').length, 1)
  assert.ok(h.checkpoint.mock.callCount() > 0)
})

test('the Seabrook market approach and sale work before, during and after a shower', (t) => {
  const sidewalk = { x: market.x, z: market.z + 2.35 }
  const stock = { fish: 1, carrots: 0 }
  for (const [time, phase] of [[60, 'dry'], [115, 'rain'], [161.7, 'after']]) {
    const h = setup(t, {
      players: [player(0, sidewalk, { goods: stock }), player(1)],
      arrange: save => { save.islandTime = time },
    })
    const seller = h.join(tokens[0])
    const runoff = marketRunoffAt(seller.state.islandTime)
    const observer = h.join(tokens[1])
    assert.deepEqual(marketRunoffAt(observer.state.islandTime), marketRunoffAt(seller.state.islandTime))
    assert.equal(runoff.rain > 0, phase === 'rain')
    assert.equal(runoff.stream > 0, phase === 'rain')
    assert.equal(runoff.drip > 0, phase === 'after')
    h.hold(seller, 16, { z: -1 })
    h.input(seller)
    h.advance()
    assert.ok(seller.player.z < sidewalk.z - .4, phase)
    assert.match(actionHint(seller.state, seller.player)[1], /Sell for/, phase)
    seller.request('interact')
    h.advance()
    assert.deepEqual(seller.player.goods, { fish: 0, carrots: 0 }, phase)
    assert.equal(seller.state.crewCoins, saleValue(stock), phase)
    assert.equal(observer.state.crewCoins, saleValue(stock), phase)
  }
})

test('simultaneous purchases spend the last shared coin once and award the seed to its buyer', (t) => {
  const h = setup(t, { players: [player(0, market), player(1, market)], arrange(save) { save.crewCoins = 1 } })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  b.request('buy-seed')
  a.request('buy-seed')
  h.advance()
  assert.equal(a.state.crewCoins, 0)
  assert.equal(b.state.crewCoins, 0)
  assert.equal(a.player.seeds, 0)
  assert.equal(b.player.seeds, 1)
})

test('rain waters a shared plot, repeated crops grow from zero, and harvest is awarded once', (t) => {
  const plot = farmPlots[0]
  const h = setup(t, {
    players: [
      player(0, plot, { seeds: 2 }),
      player(1, plot, { inventory: ['hoe', 'watering-can'], equipped: 'hoe' }),
    ],
    arrange: (save) => { save.islandTime = daySeconds * 0.18 },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  h.click(b)
  assert.equal(a.state.farm[0], 'tilled')
  b.request('interact')
  h.advance()
  assert.equal(a.state.farm[0], 'tilled')
  a.request('interact')
  h.advance()
  assert.equal(b.state.farm[0], 'planted')
  h.advanceUntil(() => b.state.farm[0] !== 'planted')
  assert.ok(a.state.weather.rain > 0.35)
  assert.equal(b.state.farm[0], 'watered')
  h.advanceUntil(() => b.state.farm[0] !== 'watered')
  a.request('interact')
  b.request('interact')
  h.advance()
  assert.equal(a.player.goods.carrots + b.player.goods.carrots, 1)
  assert.equal(a.state.farm[0], 'grass')
  h.click(b)
  a.request('interact')
  h.advance(60)
  assert.equal(a.player.seeds, 0)
  assert.equal(b.state.farm[0], 'watered')
  assert.ok(h.game.snapshotForSave().growth[0] < 3)
  h.advanceUntil(() => b.state.farm[0] !== 'watered')
  b.request('interact')
  h.advance()
  assert.equal(b.player.goods.carrots, 1)
})

test('hand watering starts growth and darkness pauses it', (t) => {
  const h = setup(t, {
    players: [player(0, farmPlots[3], { inventory: ['watering-can'], equipped: 'watering-can' })],
    arrange: (save) => { save.world.farm[3] = 'planted'; save.islandTime = daySeconds * 0.67 },
  })
  const a = h.join(tokens[0])
  h.click(a)
  h.advance(100)
  assert.equal(a.state.farm[3], 'watered')
  assert.equal(h.game.snapshotForSave().growth[3], 0)
})
