import assert from 'node:assert/strict'
import { test } from 'node:test'
import { actionHint } from '../src/actions.ts'
import { anglerCost } from '../src/crew-appearance.ts'
import { clothingCounter } from '../src/farm.ts'
import { crewHomes } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

function atWardrobe(id) {
  const { x, z } = crewHomes[id].wardrobe
  return player(id, { x, z: z - 0.55 })
}

test('players find their own wardrobe, see applied pieces, and recover them after a rejoin and restart', t => {
  const h = setup(t, { players: [atWardrobe(0), atWardrobe(1)] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  for (const client of [a, b]) {
    assert.deepEqual(actionHint(client.state, client.player), ['E', 'Open your wardrobe'])
    client.request('interact')
    assert.equal(client.messages.at(-1).type, 'open-wardrobe')
  }
  const first = { uniform: 'default', skin: 'warm', shirt: 'blue', hat: 'none', hair: 'short', hairColor: 'black' }
  const second = { uniform: 'default', skin: 'deep', hat: 'amber', trousers: 'sand', shoes: 'brown', eyes: 'narrow' }
  a.request('appearance', { appearance: { ...first, shoes: 'constructor', trousers: 42 } })
  b.request('appearance', { appearance: second })
  h.advance()
  assert.deepEqual(b.state.players[0].appearance, first)
  assert.deepEqual(a.state.players[1].appearance, second)
  a.close()
  assert.deepEqual(h.join(tokens[0]).player.appearance, first)

  const restarted = setup(t, { saved: h.game.snapshotForSave() })
  assert.deepEqual(restarted.join(tokens[1]).player.appearance, second)
  assert.deepEqual(restarted.join(tokens[0]).player.appearance, first)
})

test('work outfits respect shared qualifications while keeping the wearer’s personal and everyday choices', t => {
  const h = setup(t, { players: [atWardrobe(0), atWardrobe(1)] })
  const a = h.join(tokens[0])
  const everyday = { uniform: 'default', skin: 'deep', hair: 'short', nose: 'small', mouth: 'wide', shirt: 'blue', shoes: 'brown' }
  a.request('appearance', { appearance: { ...everyday, uniform: 'courier' } })
  a.request('appearance', { appearance: { ...everyday, uniform: 'rescue' } })
  h.advance()
  assert.deepEqual(a.player.appearance, everyday)

  const delivered = setup(t, { saved: h.game.snapshotForSave(), arrange: save => { save.world.mission = 'fire' } })
  const courier = delivered.join(tokens[0])
  courier.request('appearance', { appearance: { ...everyday, uniform: 'courier' } })
  courier.request('appearance', { appearance: { ...everyday, uniform: 'rescue' } })
  delivered.advance()
  assert.deepEqual(courier.player.appearance, { ...everyday, uniform: 'courier' })

  const qualified = setup(t, { saved: delivered.game.snapshotForSave(), arrange: save => { save.world.mission = 'complete' } })
  const left = qualified.join(tokens[0])
  const right = qualified.join(tokens[1])
  assert.equal(left.player.appearance.uniform, 'courier')
  for (const client of [left, right]) client.request('appearance', { appearance: { ...everyday, uniform: 'rescue' } })
  qualified.advance()
  assert.ok(left.state.players.every(entry => entry.appearance.uniform === 'rescue'))
  left.request('appearance', { appearance: everyday })
  qualified.advance()
  assert.deepEqual(left.player.appearance, everyday)
  assert.deepEqual(right.player.appearance, { ...everyday, uniform: 'rescue' })
})

test('a returning profile keeps its default palette when the other slot is the only one available', t => {
  const h = setup(t)
  const first = h.join(tokens[0])
  const second = h.join(tokens[1])
  first.close()
  h.elapse(12_100)
  assert.equal(h.join(tokens[2]).player.id, 0)
  second.close()
  h.elapse(12_100)
  const returning = h.join(tokens[0])
  assert.equal(returning.player.id, 1)
  assert.equal(returning.player.appearanceBase, 0)
})

test('the last three crew coins buy one outfit for one player even when both purchase before the next tick', t => {
  const point = { x: clothingCounter.x, z: clothingCounter.z + 0.85 }
  const h = setup(t, { players: [player(0, point), player(1, point)], arrange: save => { save.crewCoins = anglerCost } })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  for (const client of [a, b]) {
    assert.deepEqual(actionHint(client.state, client.player), ['E', 'Browse the clothing counter'])
    client.request('interact')
    assert.equal(client.messages.at(-1).type, 'open-clothing-counter')
  }
  a.request('buy-angler')
  b.request('buy-angler')
  a.request('buy-angler')
  h.advance()
  const results = client => client.messages.filter(message => message.type === 'angler-purchase').map(message => message.result)
  assert.deepEqual(results(a), ['bought', 'already-owned'])
  assert.deepEqual(results(b), ['insufficient-funds'])
  assert.equal(a.player.ownsAngler, true)
  assert.equal(b.player.ownsAngler, false)
  assert.equal(a.state.crewCoins, 0)
  assert.equal(b.state.crewCoins, 0)

  const restarted = setup(t, { saved: h.game.snapshotForSave() })
  const buyer = restarted.join(tokens[0])
  const equip = uniform => {
    buyer.request('appearance', { appearance: { uniform, skin: 'warm' } })
    restarted.advance()
    assert.equal(buyer.player.appearance.uniform, uniform)
    assert.equal(buyer.state.crewCoins, 0)
  }
  equip('angler')
  equip('default')
  equip('angler')
})

test('purchasing from outside the counter leaves purchases and crew coins untouched', t => {
  const h = setup(t, { arrange: save => { save.crewCoins = anglerCost } })
  const a = h.join(tokens[0])
  a.request('buy-angler')
  h.advance()
  assert.equal(a.messages.at(-1).result, 'away')
  assert.equal(a.player.ownsAngler, false)
  assert.equal(a.state.crewCoins, anglerCost)
})

test('individual purchases unlock only the buyer’s matching piece and keep the rest of their outfit', t => {
  const point = { x: clothingCounter.x, z: clothingCounter.z + 0.82 }
  const h = setup(t, { players: [player(0, point), player(1, point)], arrange: save => { save.crewCoins = 3 } })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  const pieces = { uniform: 'default', skin: 'warm', hat: 'amber', trousers: 'sand', shoes: 'brown' }
  a.request('appearance', { appearance: { ...pieces, shirt: 'coral' } })
  a.request('buy-clothing', { item: 'constructor' })
  h.advance()
  assert.deepEqual(a.player.appearance, pieces)
  assert.equal(a.state.crewCoins, 3)
  assert.equal(a.player.ownedClothes, undefined)

  a.request('buy-clothing', { item: 'coral-shirt' })
  assert.deepEqual(a.messages.at(-1), { type: 'clothing-purchase', item: 'coral-shirt', result: 'bought' })
  a.request('buy-clothing', { item: 'coral-shirt' })
  assert.equal(a.messages.at(-1).result, 'already-owned')
  b.request('buy-clothing', { item: 'lagoon-swimsuit' })
  a.request('buy-clothing', { item: 'lagoon-swimsuit' })
  assert.equal(a.messages.at(-1).result, 'insufficient-funds')
  a.request('appearance', { appearance: { ...pieces, shirt: 'coral' } })
  a.request('appearance', { appearance: { ...pieces, shirt: 'lagoon' } })
  b.request('appearance', { appearance: { ...pieces, shirt: 'lagoon', hat: 'none', shoes: 'bare' } })
  h.advance()
  assert.equal(a.state.crewCoins, 0)
  assert.equal(b.state.crewCoins, 0)
  assert.deepEqual(a.player.ownedClothes, ['coral-shirt'])
  assert.deepEqual(b.player.ownedClothes, ['lagoon-swimsuit'])
  assert.deepEqual(b.state.players[0].appearance, { ...pieces, shirt: 'coral' })
  assert.deepEqual(a.state.players[1].appearance, { ...pieces, shirt: 'lagoon', hat: 'none', shoes: 'bare' })

  const restarted = setup(t, { saved: h.game.snapshotForSave() })
  const swimmer = restarted.join(tokens[1])
  assert.deepEqual(swimmer.player.ownedClothes, ['lagoon-swimsuit'])
  swimmer.request('appearance', { appearance: { ...pieces, shirt: 'blue' } })
  restarted.advance()
  assert.equal(swimmer.player.appearance.trousers, 'sand')
  assert.equal(swimmer.player.appearance.shirt, 'blue')
  assert.equal(swimmer.state.crewCoins, 0)
})
