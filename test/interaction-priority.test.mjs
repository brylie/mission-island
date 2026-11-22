import assert from 'node:assert/strict'
import test from 'node:test'
import { fenceZ, gateway } from '../src/gate-repair.ts'
import { defaultInteraction, interactions } from '../src/interaction-options.ts'
import { mergeDisjoint } from '../src/interactions/definition.ts'
import { blankRecord } from '../src/residents/trust.ts'
import { walkingHeight } from '../src/terrain.ts'
import { daySeconds } from '../src/weather.ts'
import { itemStarts, offset, truckStart } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const at = (hour, day = 0) => day * daySeconds + ((hour - 6 + 24) % 24) * daySeconds / 24
const toolboxId = itemStarts.findIndex(({ kind }) => kind === 'toolbox')
const atTheGate = { x: gateway.x, z: fenceZ - .9 }
const offered = (client) => interactions(client.state, client.player).map(({ action, label }) => ({ action, label }))
const act = (h, client, action, subject) => {
  client.request('interact', { choice: { action, ...subject !== undefined && { subject } } })
  h.advance()
}

test('a feature cannot reuse another feature\'s interaction action', () => {
  assert.deepEqual(mergeDisjoint({ open: 1 }, { plane: 2 }), { open: 1, plane: 2 })
  assert.throws(() => mergeDisjoint({ open: 'explicit' }, { plane: 'explicit' }, { open: 'default' }),
    /"open" is defined by more than one feature/)
})

test('holding the toolbox at a caught gate offers planing before setting the toolbox down', (t) => {
  const h = setup(t, {
    players: [player(0, atTheGate, { y: walkingHeight(atTheGate) })],
    arrange: (save) => {
      save.islandTime = at(10, 2)
      Object.assign(save.world, { mission: 'complete', fire: 0 })
      Object.assign(save.world.gateRepair, { stage: 'mended', acceptedAt: 0, mendedAt: at(9), swelling: 'swollen' })
      save.world.residents.wren = { ...blankRecord(), trust: 1, kept: ['wren-gate'], active: 'wren-swell' }
      Object.assign(save.world.items[toolboxId], { x: gateway.x + .6, z: fenceZ - 1.1, holder: null })
    },
  })
  const a = h.join(tokens[0])
  act(h, a, 'check-swing')
  assert.equal(a.state.residents.wren.checked, 'fault')
  act(h, a, 'pick-up', toolboxId)
  assert.equal(a.state.items[toolboxId].holder, a.player.id, 'the toolbox is in hand')

  const options = offered(a)
  const plane = options.findIndex(({ action }) => action === 'plane')
  const putDown = options.findIndex(({ label }) => label === 'Set toolbox down')
  assert.ok(plane >= 0 && putDown >= 0, JSON.stringify(options))
  assert.ok(plane < putDown, 'the repair step outranks setting the toolbox down')
  assert.equal(options[0].label, 'Plane the swollen edge', 'the prompt shows the repair step')
  assert.equal(defaultInteraction(a.state, a.player)?.action, 'plane')
})

test('holding a crate beside the flatbed offers to load it', (t) => {
  const bed = offset(truckStart, 2.1, 0.9)
  const h = setup(t, {
    players: [player(0, bed)],
    arrange: (save) => { save.world.items[0].holder = 0 },
  })
  const a = h.join(tokens[0])
  const [first] = offered(a)
  assert.deepEqual(first, { action: 'put-down', label: 'Load crate' })
  assert.equal(defaultInteraction(a.state, a.player)?.label, 'Load crate', 'E loads the crate')
})
