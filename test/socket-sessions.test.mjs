import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setup, tokens } from './support/game-harness.mjs'

test('socket sessions skip snapshots for pending and backed-up clients while the island keeps ticking', (t) => {
  const game = setup(t)
  const pending = game.link()
  const a = game.join(tokens[0])
  const b = game.join(tokens[1])
  const initialTime = a.state.islandTime

  a.bufferedAmount = 65_536
  game.advance()
  assert.equal(pending.state, undefined)
  assert.equal(a.state.islandTime, initialTime)
  assert.ok(b.state.islandTime > initialTime)

  a.bufferedAmount = 0
  game.advance()
  assert.equal(a.state.islandTime, b.state.islandTime)
})
