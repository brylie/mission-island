import assert from 'node:assert/strict'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { gateMendedStage, onBench, toolboxItem } from '../src/gate-repair.ts'
import { interactions } from '../src/interaction-options.ts'
import { scenarioCatalog, checkpointSettings } from '../server/scenarios/catalog.ts'
import { actionHint, interactRequest } from '../src/actions.ts'
import { fisherAt } from '../src/harbor-fisher.ts'
import { commuteCheckpoint, walkingCheckpoint, walkingLane } from '../src/walking-scenario.ts'
import { crewCarrySpeed, crewSprintMultiplier, crewWalkSpeed } from '../src/world.ts'
import { tokens } from './support/game-harness.mjs'

test('the launcher accepts only known checkpoints and one or two crew members', () => {
  assert.deepEqual(checkpointSettings('wren-discover', '1'), { checkpoint: 'wren-discover', seats: 1 })
  assert.equal(checkpointSettings('unknown', '2'), undefined)
  assert.equal(checkpointSettings('wren-fit', '3'), undefined)
})

for (const { id: checkpoint } of scenarioCatalog) {
  for (const seats of [1, 2]) {
    test(`live ${checkpoint} with ${seats} seat(s)`, () => {
      const game = createGame({ playtest: { checkpoint, seats, revision: 1 } })
      const join = index => game.join(tokens[index], () => {})
      const a = join(0)
      let b
      if (seats === 2) {
        const before = game.tick().islandTime
        a.dispatch({ type: 'crew-name', name: 'Before start' })
        assert.equal(game.tick().players[0].name, 'Crew 1')
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
        for (const player of state.players) assert.equal(interactions(state, player)[0]?.action, 'fit')
        const baseline = state.crewCoins
        a.dispatch({ type: 'interact', choice: { action: 'fit' } })
        assert.equal(game.tick().gateRepair.stage, 'fitted')
        assert.equal(state.crewCoins, baseline)
        const tester = b ?? a
        tester.dispatch({ type: 'interact', choice: { action: 'test' } })
        a.dispatch({ type: 'interact', choice: { action: 'test' } })
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
        assert.ok(onBench(toolboxItem(state)))
      } else if (checkpoint === 'dock-fishing') {
        for (const angler of [a, b].filter(Boolean)) {
          const player = state.players.find(p => p.id === angler.id)
          assert.deepEqual(player.inventory, ['fishing-rod'])
          assert.equal(player.equipped, 'fishing-rod')
          angler.dispatch({ type: 'primary', phase: 'start' })
          assert.equal(player.charge?.kind, 'cast')
          angler.dispatch({ type: 'primary', phase: 'release', aim: player.heading })
          assert.ok(player.casting)
        }
      } else if (checkpoint === 'harbor-delivery') {
        assert.equal(state.mission, 'delivery')
        assert.match(actionHint(state, state.players[0])[1], /crate/i)
      } else if (checkpoint === walkingCheckpoint) {
        const walker = state.players[0]
        assert.equal(walker.x, walkingLane.start.x)
        assert.equal(walker.z, walkingLane.start.z)
        if (b) assert.equal(state.players[1].x, walkingLane.observer.x)
        const crate = state.items[0]
        assert.ok(Math.abs(crate.x - walkingLane.crate.x) < .01)
        assert.match(actionHint(state, walker)[1], /crate/i)
        const walk = (x, sprint = false) => {
          const start = walker.x
          for (let tick = 0; tick < 24; tick++) {
            a.dispatch({ type: 'input', input: { x, z: 0, sprint } })
            game.tick()
          }
          assert.equal(walker.z, walkingLane.start.z)
          return Math.abs(walker.x - start) / .8
        }
        assert.ok(Math.abs(walk(1) - crewWalkSpeed) < 1e-6)
        assert.ok(Math.abs(walk(-1, true) - crewWalkSpeed * crewSprintMultiplier) < 1e-6)
        walk(1)
        a.dispatch({ type: 'input', input: { x: -1, z: 0, sprint: false } })
        for (let tick = 0; tick < 11; tick++) game.tick()
        const pickUp = interactRequest(state, walker)
        assert.deepEqual(pickUp, { type: 'interact', choice: { action: 'pick-up', subject: crate.id } })
        a.dispatch(pickUp)
        assert.equal(crate.holder, a.id)
        assert.ok(Math.abs(walk(1) - crewCarrySpeed) < 1e-6)
        if (b) assert.equal(state.players[1].x, walkingLane.observer.x)
      } else if (checkpoint === commuteCheckpoint) {
        assert.ok(state.weather.hour < 6)
        let ticks = 0
        while (state.weather.hour < 6 && ticks++ < 400) game.tick()
        const before = fisherAt(state.weather.hour)
        for (let tick = 0; tick < 90; tick++) game.tick()
        const after = fisherAt(state.weather.hour)
        assert.equal(after.walking, true)
        assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > 3)
      }
    })
  }
}
