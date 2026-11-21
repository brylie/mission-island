import assert from 'node:assert/strict'
import test from 'node:test'
import { actionHint, interactRequest } from '../src/actions.ts'
import { fenceZ, gateway, wrenAt } from '../src/gate-repair.ts'
import { daySeconds } from '../src/weather.ts'
import { distance } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const lane = { x: gateway.x, z: fenceZ - .9 }
const noon = daySeconds / 4
const at = (hour, day = 0) => day * daySeconds + ((hour - 6 + 24) % 24) * daySeconds / 24

function walkTo(h, client, ...targets) {
  for (const target of targets) {
    for (let tick = 0; tick < 190 && distance(client.player, target) > .17; tick++) {
      const d = distance(client.player, target)
      h.input(client, { x: (target.x - client.player.x) / d, z: (target.z - client.player.z) / d })
      h.advance()
    }
    h.input(client)
    h.advance()
    assert.ok(distance(client.player, target) <= .3, `walked to ${target.x}, ${target.z}`)
  }
}

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
  assert.deepEqual(interactRequest(a.state, a.player), { type: 'interact', choice: { action: 'pick-up', subject: 0 } })
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

test('a player following Wren out through the mended gate is never shut in, and Wren at home leaves it alone', (t) => {
  const settled = (save) => {
    save.islandTime = at(6.98, 1)
    Object.assign(save.world.gateRepair, { stage: 'mended', acceptedAt: at(8), mendedAt: at(10) })
    save.world.residentTrust.wren = 1
  }
  const h = setup(t, { players: [player(0, { x: gateway.x - .5, z: fenceZ + 1.3 })], arrange: settled })
  const a = h.join(tokens[0])
  assert.ok(distance(wrenAt({ ...a.state, islandTime: at(3, 1) }), gateway) >= 1.5, 'home is clear of the gateway')
  h.advanceUntil(() => a.state.gate.open, 200)
  walkTo(h, a, { x: gateway.x, z: fenceZ + .4 })
  h.advance(90)
  assert.ok(distance(wrenAt(a.state), gateway) > 1.5, 'Wren has gone through')
  assert.equal(a.state.gate.open, true, 'held open for the crewmate in the opening')
  walkTo(h, a, gateway, { x: gateway.x, z: fenceZ - 1.6 })
  h.advance()
  assert.equal(a.state.gate.open, false)
  assert.ok(a.player.z < fenceZ - 1)
})

test('a press without a chosen target never starts a gate repair step', (t) => {
  const h = setup(t, {
    players: [player(0, lane)],
    arrange(save) {
      save.islandTime = noon
      Object.assign(save.world.gateRepair, { stage: 'accepted', acceptedAt: 0 })
    },
  })
  const a = h.join(tokens[0])
  a.request('interact')
  h.advance()
  assert.equal(a.state.gateRepair.stage, 'accepted')
  a.request('interact', { choice: { action: 'inspect' } })
  h.advance()
  assert.equal(a.state.gateRepair.stage, 'inspected')
})
