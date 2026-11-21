import assert from 'node:assert/strict'
import test from 'node:test'
import { actionHint, interactRequest } from '../src/actions.ts'
import { fenceZ, gateway } from '../src/gate-repair.ts'
import { daySeconds } from '../src/weather.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const lane = { x: gateway.x, z: fenceZ - .9 }
const noon = daySeconds / 4

test('E at the gate picks up a crate in reach instead of swinging the gate', (t) => {
  const h = setup(t, {
    players: [player(0, lane)],
    arrange(save) {
      save.islandTime = noon
      Object.assign(save.world.items[0], { x: gateway.x + .9, z: lane.z, y: .45 })
    },
  })
  const a = h.join(tokens[0])
  assert.equal(a.state.mission, 'delivery')
  assert.deepEqual(interactRequest(a.state, a.player), { type: 'interact' })
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Pick up crate'])
  a.request('interact')
  h.advance()
  assert.equal(a.state.items[0].holder, 0)
  assert.equal(a.state.gate.open, false)
})

test('a closing gate waits for a loose crate to leave the opening', (t) => {
  const h = setup(t, {
    players: [player(0, { x: gateway.x, z: fenceZ - 2.4 })],
    arrange(save) {
      save.islandTime = noon
      Object.assign(save.world.gateRepair, { stage: 'mended', acceptedAt: 0, mendedAt: 0 })
      save.world.gate = { open: true, closePending: true }
      Object.assign(save.world.items[0], { x: gateway.x + .2, z: fenceZ - .3, y: .45 })
    },
  })
  const a = h.join(tokens[0])
  h.advance(5)
  assert.equal(a.state.gate.open, true, 'the crate in the opening holds the gate open')
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Pick up crate'])
  a.request('interact')
  h.advance()
  assert.equal(a.state.items[0].holder, 0)
  h.advance()
  assert.equal(a.state.gate.open, false, 'once the crate is carried out of the opening the gate closes')
})
