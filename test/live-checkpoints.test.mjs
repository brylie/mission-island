import assert from 'node:assert/strict'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { gateFavor, gateMendedStage, onBench, toolboxItem } from '../src/gate-repair.ts'
import { interactions } from '../src/interaction-options.ts'
import { carriedMaterial, initialMaterialsWork } from '../src/materials-work.ts'
import { scenarioCatalog, checkpointSettings } from '../server/scenarios/catalog.ts'
import { actionHint } from '../src/actions.ts'
import { blankRecord } from '../src/residents/trust.ts'
import { repairSupplyFavor } from '../src/worlds/starter/residents/wren.ts'
import { player, tokens } from './support/game-harness.mjs'

test('the launcher accepts only known checkpoints and one or two crew members', () => {
  assert.deepEqual(checkpointSettings('wren-discover', '1'), { checkpoint: 'wren-discover', seats: 1 })
  assert.equal(checkpointSettings('unknown', '2'), undefined)
  assert.equal(checkpointSettings('wren-fit', '3'), undefined)
})

test('the materials checkpoint resets a saved repair and the crew’s carried materials', () => {
  const save = createGame().snapshotForSave()
  save.islandTime = 160
  save.world.gateRepair = { stage: 'mended', pinHolder: null, acceptedAt: 10, mendedAt: 20 }
  save.world.residents.wren = { trust: 2, kept: [gateFavor, repairSupplyFavor.id], active: null }
  save.world.materialsWork = { checkout: 'qualified', request: { material: 'stone', delivered: 2 }, readyAt: { timber: 161, stone: 162 } }
  save.crew = tokens.slice(0, 2).map((token, index) => ({ token, reserved: true,
    player: player(index, undefined, { materials: { timber: 1, stone: 2 } }) }))

  const game = createGame({ save, playtest: { checkpoint: 'materials-checkout', seats: 2, revision: 1 } })
  for (const token of tokens.slice(0, 2)) assert.equal(game.join(token, () => {}).type, 'joined')
  const state = game.tick()
  assert.equal(state.playtest.started, true)
  assert.deepEqual(state.materialsWork, initialMaterialsWork())
  assert.deepEqual(state.residents.wren, { ...blankRecord(), trust: 1, kept: [gateFavor] })
  for (const member of state.players) {
    assert.equal(carriedMaterial(member, 'timber'), 0)
    assert.equal(carriedMaterial(member, 'stone'), 0)
  }
  assert.deepEqual(save.world.materialsWork.request, { material: 'stone', delivered: 2 })
  assert.deepEqual(save.crew[0].player.materials, { timber: 1, stone: 2 })
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
        assert.equal(state.residents.wren.trust, 1)
        a.disconnect()
        assert.equal(join(0).id, a.id)
        assert.equal(game.tick().gateRepair.stage, 'mended')
      } else if (checkpoint === 'wren-morning') {
        assert.equal(gateMendedStage(state), 'settled')
        assert.ok(state.weather.hour < 7)
        assert.equal(state.crewCoins, 5)
        assert.equal(state.residents.wren.trust, 1)
      } else if (checkpoint === 'wren-swell') {
        assert.equal(state.residents.wren.active, 'wren-swell')
        for (const player of state.players) assert.equal(interactions(state, player)[0]?.action, 'check-swing')
        a.dispatch({ type: 'interact', choice: { action: 'check-swing' } })
        assert.equal(game.tick().residents.wren.checked, 'fault')
        assert.equal(interactions(state, state.players[0])[0]?.action, 'plane', 'the toolbox is already at the gate')
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
      } else if (checkpoint === 'ridge-checkout') {
        assert.equal(state.aviation.qualified, false)
        if (b) {
          b.dispatch({ type: 'interact' })
          assert.equal(game.tick().aviation.marked, true)
        }
        a.dispatch({ type: 'interact' })
        assert.equal(game.tick().aviation.flight?.pilotId, a.id)
        assert.equal(game.tick().aviation.flight?.outing, 'checkout')
      } else if (checkpoint === 'ridge-soaring') {
        assert.equal(state.weather.rain, 0)
        assert.ok(state.weather.hour > 10 && state.weather.hour < 11)
        a.dispatch({ type: 'interact' })
        assert.equal(game.tick().aviation.flight?.outing, 'free')
      } else if (checkpoint === 'village-favors') {
        for (const player of state.players) {
          assert.ok(interactions(state, player).some(({ action, subject }) => action === 'accept-favor' && subject === 3), 'Bram asks')
          assert.deepEqual(player.goods, { fish: 2, carrots: 2 })
        }
        a.dispatch({ type: 'interact', choice: { action: 'accept-favor', subject: 3 } })
        assert.equal(game.tick().residents.bram.active, 'bram-staging')
        assert.ok(state.items.some(({ kind, delivered }) => kind === 'crate' && !delivered), 'a crate waits in the yard')
      } else if (checkpoint === 'harbor-delivery') {
        assert.equal(state.mission, 'delivery')
        assert.match(actionHint(state, state.players[0])[1], /crate/i)
      }
    })
  }
}
