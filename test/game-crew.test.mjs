import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { test } from 'node:test'
import { createGame } from '../server/game.ts'
import { createSocketSessions } from '../server/socket-sessions.ts'
import { actionHint } from '../src/actions.ts'
import { atHomeDoor } from '../src/interactions/home.ts'
import { chargePower } from '../src/charged-actions.ts'
import { daySeconds, isNight } from '../src/weather.ts'
import { spawns } from '../src/world.ts'
import { tokens, GameClient, player, setup, door } from './support/game-harness.mjs'

test('one player turns in at their door and advances to dawn', (t) => {
  const h = setup(t, {
    players: [player(0, door(0))],
    arrange: (save) => { save.islandTime = daySeconds * 0.68 },
  })
  const a = h.join(tokens[0])
  assert.ok(atHomeDoor(a.player))
  assert.match(actionHint(a.state, a.player)[1], /Turn in/)
  a.request('interact')
  h.advance()
  assert.equal(a.state.weather.hour, 6)
  assert.equal(a.player.sleeping, false)
})

test('two connected players must turn in, and a waiting player can cancel', (t) => {
  const h = setup(t, {
    players: [player(0, door(0)), player(1, door(1))],
    arrange: (save) => { save.islandTime = daySeconds * 0.73 },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('interact')
  h.advance()
  assert.equal(a.player.sleeping, true)
  assert.match(actionHint(a.state, a.player)[1], /Waiting/)
  assert.ok(isNight(b.state.weather.hour))
  a.request('interact')
  h.advance()
  assert.equal(a.player.sleeping, false)
  a.request('interact')
  h.input(a, { z: -1 })
  h.advance()
  assert.equal(a.player.sleeping, false)
  h.input(a)
  a.request('interact')
  b.request('interact')
  h.advance()
  assert.deepEqual(a.state.weather, b.state.weather)
  assert.equal(a.state.islandTime, b.state.islandTime)
  assert.equal(b.state.weather.hour, 6)
  assert.equal(b.player.sleeping, false)
  a.request('interact')
  h.advance()
  assert.equal(a.player.sleeping, false)
})

test('an occupied crew slot is protected, reconnects, and keeps its profile after expiry', (t) => {
  const h = setup(t)
  const invalid = h.link()
  invalid.emit('message', Buffer.from('{'))
  invalid.emit('message', Buffer.from('null'))
  invalid.request('interact')
  invalid.request('join', { token: 'invalid' })
  assert.equal(invalid.messages.length, 0)
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.equal(h.join(tokens[0]).messages[0].type, 'duplicate')
  assert.equal(h.join(tokens[2]).messages[0].type, 'full')
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Take tools and a carrot seed'])
  a.request('interact')
  a.request('appearance', { appearance: { uniform: 'angler', skin: 'deep' } })
  a.request('input', { input: null })
  h.advance()
  assert.equal(a.player.equipped, 'fishing-rod')
  assert.deepEqual(a.player.appearance, { uniform: 'default', skin: 'deep' })
  assert.equal(a.state.players.length, 2)
  a.close()
  assert.equal(h.join(tokens[0]).player.inventory.length, 3)
  b.close()
  h.advance(363)
  assert.equal(h.game.snapshotForSave().crew.find(({ token }) => token === tokens[1]).reserved, false)
  const restored = h.join(tokens[1])
  assert.equal(restored.player.id, 1)
  assert.equal(restored.player.connected, true)
})

test('crewmates see the raised right hand independently of left reach, and it clears on release or timeout', (t) => {
  const h = setup(t)
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  const observed = () => b.state.players.find(({ id }) => id === a.player.id)
  h.input(a, { raiseRightHand: true })
  a.request('primary', { phase: 'start' })
  h.advance()
  assert.equal(observed().rightHandRaised, true)
  assert.equal(observed().reaching, true)
  assert.equal(h.game.snapshotForSave().crew[0].player.rightHandRaised, false)
  h.input(a, { raiseRightHand: false })
  h.advance()
  assert.equal(observed().rightHandRaised, false)
  assert.equal(observed().reaching, true)
  h.input(a, { raiseRightHand: true })
  h.advance()
  h.elapse(450)
  assert.equal(observed().rightHandRaised, false)
})

test('the cottage gives each saved profile one starter seed, including existing tool owners', (t) => {
  const h = setup(t, { players: [player(0), player(1, spawns[1], { inventory: ['hoe'] })] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Take tools and a carrot seed'])
  assert.deepEqual(actionHint(b.state, b.player), ['E', 'Collect starter carrot seed'])
  a.request('interact')
  b.request('interact')
  h.advance()
  assert.equal(a.player.seeds, 1)
  assert.equal(b.player.seeds, 1)
  assert.deepEqual(b.player.inventory, ['hoe'])
  assert.equal(a.messages.filter(({ type }) => type === 'starter-seed').length, 1)
  const resumed = setup(t, { saved: h.game.snapshotForSave() })
  const returning = resumed.join(tokens[0])
  returning.request('interact')
  resumed.advance()
  returning.request('interact')
  resumed.advance()
  assert.equal(returning.player.seeds, 1)
  assert.equal(returning.player.inventory.length, 3)
})

test('each cottage has its own daytime welcome note and keeps its owner across a rejoin', (t) => {
  const h = setup(t, { players: [player(0, door(0)), player(1, door(1))] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  for (const client of [a, b]) {
    assert.deepEqual(actionHint(client.state, client.player), ['E', 'Read your welcome note'])
    client.request('interact')
    assert.deepEqual(client.messages.at(-1), { type: 'crew-note' })
    client.close()
  }
  h.elapse(12_100)
  const resumed = setup(t, { saved: h.game.snapshotForSave() })
  assert.equal(resumed.join(tokens[1]).player.id, 1)
  assert.equal(resumed.join(tokens[0]).player.id, 0)
})

test('a saved night, held equipment and inventory resume after recreating the host', (t) => {
  const h = setup(t, {
    players: [player(0, door(0), { seeds: 2, goods: { fish: 2, carrots: 3 } })],
    arrange: (save) => {
      save.crewCoins = 6
      save.islandTime = daySeconds * 0.8
      save.world.farm[2] = 'watered'
      save.growth[2] = 9
      save.world.items[0].holder = 0
    },
  })
  h.join(tokens[0])
  const save = h.game.snapshotForSave()
  const restarted = createGame({ save })
  const a = new GameClient()
  t.after(() => a.close())
  const sessions = createSocketSessions(restarted)
  sessions.connect(a)
  a.request('join', { token: tokens[0] })
  sessions.tick()
  assert.ok(isNight(a.state.weather.hour))
  assert.equal(a.state.crewCoins, 6)
  assert.equal(a.player.seeds, 2)
  assert.equal(a.state.items[0].holder, 0)
  assert.equal(a.state.farm[2], 'watered')
  assert.equal(restarted.snapshotForSave().growth[2], 9)
  assert.equal(chargePower('throw', 3), 1)
})
