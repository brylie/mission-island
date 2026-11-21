import assert from 'node:assert/strict'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { gateAction, gateMendedStage, onPeg, toolboxItem } from '../src/gate-repair.ts'
import { checkpoints, checkpointSettings } from '../src/live-checkpoints.ts'
import { actionHint } from '../src/actions.ts'
import { tokens } from './support/game-harness.mjs'

test('the launcher accepts only known checkpoints and one or two crew members', () => {
  assert.deepEqual(checkpointSettings('wren-discover', '1'), { checkpoint: 'wren-discover', seats: 1 })
  assert.equal(checkpointSettings('unknown', '2'), undefined)
  assert.equal(checkpointSettings('wren-fit', '3'), undefined)
})

for (const checkpoint of Object.keys(checkpoints)) {
  for (const seats of [1, 2]) {
    test(`live ${checkpoint} with ${seats} seat(s)`, () => {
      const game = createGame({ playtest: { checkpoint, seats, revision: 1 } })
      const join = index => game.join(tokens[index], () => {})
      const a = join(0)
      let b
      if (seats === 2) {
        const before = game.tick().islandTime
        a.dispatch({ type: 'interact', intent: 'fit' })
        assert.equal(game.tick().islandTime, before)
        assert.equal(game.tick().playtest.started, false)
        b = join(1)
      }
      assert.equal(join(2).type, 'full')
      const state = game.tick()
      assert.equal(state.playtest.started, true)
      if (checkpoint === 'wren-fit') {
        const box = toolboxItem(state)
        assert.equal(box.holder, seats === 1 ? null : a.id)
        assert.equal(state.gateRepair.pinHolder, b?.id ?? a.id)
        for (const player of state.players) assert.equal(gateAction(state, player), 'fit')
        const baseline = state.crewCoins
        a.dispatch({ type: 'interact', intent: 'fit' })
        assert.equal(game.tick().gateRepair.stage, 'fitted')
        assert.equal(state.crewCoins, baseline)
        const tester = b ?? a
        tester.dispatch({ type: 'interact', intent: 'test' })
        a.dispatch({ type: 'interact', intent: 'test' })
        assert.equal(game.tick().crewCoins, baseline + 5)
        assert.equal(state.residentTrust.wren, 1)
        a.disconnect()
        assert.equal(join(0).id, a.id)
        assert.equal(game.tick().gateRepair.stage, 'mended')
      } else if (checkpoint === 'wren-morning') {
        assert.equal(gateMendedStage(state), 'settled')
        assert.ok(state.weather.hour < 7)
        assert.equal(state.crewCoins, 5)
        assert.equal(state.residentTrust.wren, 1)
      } else if (checkpoint === 'wren-discover') {
        assert.equal(state.gateRepair.stage, 'sagging')
        assert.ok(onPeg(toolboxItem(state)))
      } else {
        assert.equal(state.mission, 'delivery')
        assert.match(actionHint(state, state.players[0])[1], /crate/i)
      }
    })
  }
}
