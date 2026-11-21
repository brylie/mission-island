import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canWalkAt } from '../src/simulation/movement.ts'
import { actionHint } from '../src/actions.ts'
import { fisherAt } from '../src/harbor-fisher.ts'
import { harborRoad } from '../src/routes.ts'
import { maxWadeDepth, walkingHeight, waterLevel } from '../src/terrain.ts'
import { daySeconds } from '../src/weather.ts'
import { ferryTerminal, skiffStart } from '../src/world.ts'
import { tokens, player, setup } from './support/game-harness.mjs'

function cast(h, client, heading) {
  h.input(client)
  client.request('primary', { phase: 'start' })
  h.hold(client, 26)
  assert.ok(client.player.charge.power > 0.9)
  client.request('primary', { phase: 'release', aim: heading })
  h.advance()
}

test('dock fishing synchronizes a bite, lets the player reel and rewards the landed fish', (t) => {
  const point = { x: -44, z: -36.7 }
  const h = setup(t, { players: [player(0, point, { inventory: ['fishing-rod'], equipped: 'fishing-rod' })] })
  const a = h.join(tokens[0])
  cast(h, a, 0)
  assert.ok(a.messages.some(({ result }) => result === 'dry-cast'))
  cast(h, a, Math.PI)
  assert.ok(a.player.casting.bobber.z < point.z)
  h.hold(a, 110)
  assert.match(actionHint(a.state, a.player)[1], /reel/)
  assert.equal(a.player.goods.fish, 0)
  let reeling = false
  for (let i = 0; i < 690 && a.player.casting; i++) {
    h.input(a)
    const desired = !a.player.casting.fight.pulling
    if (desired !== reeling) a.request('primary', { phase: desired ? 'start' : 'release' })
    reeling = desired
    h.advance()
  }
  assert.equal(a.player.goods.fish, 1)
  assert.ok(a.messages.some(({ result }) => result === 'caught'))
})

test('a bite is independent of the cast meter and walking retrieves the line', (t) => {
  const h = setup(t, {
    players: [player(0, { x: -44, z: -36.7 }, { inventory: ['fishing-rod'], equipped: 'fishing-rod' })],
    random: () => 1,
  })
  const a = h.join(tokens[0])
  cast(h, a, Math.PI)
  h.hold(a, 111)
  assert.ok(a.messages.some(({ result }) => result === 'no-bite'))
  assert.equal(a.player.goods.fish, 0)
  cast(h, a, Math.PI)
  h.hold(a, 2, { x: 1 })
  assert.equal(a.player.casting, null)
})

test('two players board a skiff, and paddling retrieves the other player’s line', (t) => {
  const shore = { x: -46.7, z: -33.9 }
  const rod = { inventory: ['fishing-rod'], equipped: 'fishing-rod' }
  const h = setup(t, { players: [player(0, shore, rod), player(1, shore, rod)] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.equal(actionHint(a.state, a.player)[1], 'Board skiff')
  a.request('seat'); b.request('seat')
  h.advance()
  assert.equal(a.player.seat, 'port')
  assert.equal(b.player.seat, 'starboard')
  cast(h, a, skiffStart.heading)
  h.hold(b, 15, { z: 1 })
  assert.equal(a.player.casting, null)
  assert.ok(b.state.skiff.speed > 0)
  h.click(b)
  assert.ok(b.messages.some(({ result }) => result === 'boat-moving'))
  b.request('seat')
  h.advance()
  assert.equal(b.player.seat, 'starboard')
  h.advance(50)
  b.request('seat')
  h.advance()
  assert.equal(b.player.seat, null)
  assert.ok(b.player.y < 1 && b.player.y > waterLevel - 0.55)
})

test('Mara moves between walkable stops and either crewmate can talk at the fishing dock', (t) => {
  for (const hour of [0, 18.25, ...Array.from({ length: 26 }, (_, index) => 6 + index / 100)]) {
    assert.ok(canWalkAt(fisherAt(hour), .25, waterLevel - maxWadeDepth))
  }
  const dock = fisherAt(8)
  const h = setup(t, {
    players: [player(0, dock, { y: walkingHeight(dock) }), player(1, dock, { y: walkingHeight(dock) })],
    arrange(save) { save.islandTime = daySeconds * 2 / 24 },
  })
  for (const token of tokens.slice(0, 2)) {
    const client = h.join(token)
    assert.deepEqual(actionHint(client.state, client.player), ['E', 'Talk to Mara'])
    client.request('interact')
    assert.deepEqual(client.messages.at(-1), { type: 'fisher-chat' })
  }
  // Harbor Depot road ends at the ferry barrier, and its straight ramp lane can be walked to the terminal.
  assert.deepEqual(harborRoad[0], { x: ferryTerminal.x, z: ferryTerminal.z })
  for (let z = harborRoad[1].z; z > ferryTerminal.z + 1; z -= .5) {
    assert.ok(canWalkAt({ x: ferryTerminal.x, z }, .5, waterLevel - maxWadeDepth))
  }
})

test('a skiff seat survives a slower reload while the other player paddles', (t) => {
  const h = setup(t, {
    players: [player(0, skiffStart, { seat: 'port' }), player(1, skiffStart, { seat: 'starboard' })],
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  b.close()
  h.elapse(45_000)
  h.hold(a, 100, { z: 1 })
  const restored = h.join(tokens[1])
  assert.equal(restored.player.seat, 'starboard')
  assert.equal(restored.player.swimming, false)
  assert.ok(Math.hypot(restored.player.x - restored.state.skiff.x, restored.player.z - restored.state.skiff.z) < 0.6)
})
