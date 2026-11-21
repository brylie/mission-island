import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { actionHint, interactRequest } from '../src/actions.ts'
import { interactions } from '../src/interaction-options.ts'
import { canFit, fenceZ, gateMendedStage, gateRepairGuide, gateway, initialGateRepair, onBench, wrenAt, wrenLines,
  wrenRoute } from '../src/gate-repair.ts'
import { jobBoard } from '../src/jobs.ts'
import { canWalkAt } from '../src/simulation/movement.ts'
import { daySeconds } from '../src/weather.ts'
import { coastPoint, coastRadius, shoreProfile } from '../src/terrain.ts'
import { crateStarts, distance, itemStarts, mendingBench, toolboxHome, wrenCottage } from '../src/world.ts'
import { starterFeatures } from '../src/worlds/starter/sites.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const toolboxId = itemStarts.findIndex(({ kind }) => kind === 'toolbox')
const at = (hour, day = 0) => day * daySeconds + ((hour - 6 + 24) % 24) * daySeconds / 24
const lane = { x: gateway.x, z: fenceZ - .9 }
const garden = { x: gateway.x, z: fenceZ + 1.8 }
const byWren = { x: -25.8, z: -14.8 }
const byBench = { x: -22.4, z: -15.8 }
const benchRoad = [{ x: -22.4, z: -14.2 }, { x: -26.4, z: -13.4 }, { x: -31.6, z: -11.8 }]
const toBench = [...benchRoad].reverse()

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

const top = (client) => interactions(client.state, client.player)[0]?.action
// Talking is a resident interaction; Wren is the second resident in the registry.
const choiceFor = (action) => action === 'talk' ? { action, subject: 1 } : { action }
const choose = (client, action) => client.request('interact', { choice: choiceFor(action) })

function act(h, client, action) {
  assert.deepEqual(interactRequest(client.state, client.player), { type: 'interact', choice: choiceFor(action) })
  choose(client, action)
  h.advance()
}

function count(client, type) {
  return client.messages.filter((message) => message.type === type).length
}

function repairStage(stage, { arrange, ...extra } = {}) {
  return (save) => {
    save.islandTime = at(12)
    Object.assign(save.world.gateRepair, { stage, acceptedAt: 0, ...extra })
    arrange?.(save)
  }
}

test('Wren takes the long way before the repair and the gate shortcut from the next dawn', () => {
  const broken = { gateRepair: { stage: 'sagging', pinHolder: null } }
  const mended = { gateRepair: { stage: 'mended', pinHolder: null, mendedAt: at(10) } }
  const samples = (state, from, to) => Array.from({ length: 120 }, (_, i) => wrenAt({ ...state, islandTime: from + (to - from) * i / 119 }))
  for (const spot of [...samples({ ...broken }, at(6.9), at(8)), ...samples({ ...mended }, at(17), at(18.2))]) {
    assert.ok(distance(spot, gateway) > 1.2, 'the detour stays clear of the closed gate')
    if (!spot.indoors) assert.ok(canWalkAt(spot, .3, -.3), `detour point ${spot.x}, ${spot.z}`)
  }
  assert.ok(samples({ ...broken }, at(7), at(7.4)).some((spot) => spot.indoors), 'Wren goes out the back of the cottage')
  assert.equal(gateMendedStage({ ...mended, islandTime: at(17) }), 'fixed-today')
  const tomorrow = samples({ ...mended }, at(7, 1), at(8, 1))
  assert.equal(gateMendedStage({ ...mended, islandTime: at(7, 1) }), 'settled')
  assert.ok(tomorrow.some((spot) => distance(spot, gateway) < .2), 'the morning commute passes through the gate')
  assert.ok(tomorrow.every((spot) => !spot.indoors))
  assert.notEqual(wrenRoute({ ...mended, islandTime: at(7) }), wrenRoute({ ...mended, islandTime: at(7, 1) }))
  assert.deepEqual(wrenAt({ ...broken, islandTime: at(12) }), { ...wrenAt({ ...broken, islandTime: at(12) }), walking: false })
  assert.ok(distance(wrenAt({ ...broken, islandTime: at(12) }), mendingBench) < 1.5)
})

test('a sagging gate drags short of an opening anyone can walk through', (t) => {
  const h = setup(t, { players: [player(0, lane)], arrange: (save) => { save.islandTime = at(12) } })
  const a = h.join(tokens[0])
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Try the sagging gate'])
  act(h, a, 'open')
  assert.equal(a.state.gate.open, true)
  assert.deepEqual(a.messages.at(-1), { type: 'gate-step', step: 'stuck' })
  for (const x of [gateway.x - .2, gateway.x, gateway.x + .25]) {
    walkTo(h, a, { x, z: lane.z })
    for (let tick = 0; tick < 60; tick++) {
      h.input(a, { x: 0, z: 1 })
      h.advance()
    }
    assert.ok(a.player.z < fenceZ - .15, 'the leaf and fence keep the crew out of the garden')
  }
})

test('a solo player borrows the toolbox, finds the fault, fetches a pin and tests the mended gate', (t) => {
  const h = setup(t, { players: [player(0, byWren)], arrange: (save) => { save.islandTime = at(10) } })
  const a = h.join(tokens[0])
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Talk to Wren'])
  act(h, a, 'talk')
  assert.equal(a.state.gateRepair.stage, 'accepted')
  assert.deepEqual(a.messages.filter(({ type }) => type === 'resident-chat'), [{ type: 'resident-chat', resident: 'wren' }])
  assert.deepEqual(a.state.residents.wren, { trust: 0, kept: [], active: 'wren-gate' })
  walkTo(h, a, benchRoad[0], byBench)
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Pick up the toolbox'], 'Wren gives way to the toolbox on the bench')
  a.request('interact')
  h.advance()
  assert.equal(a.state.items[toolboxId].holder, 0)
  walkTo(h, a, ...benchRoad)
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Set toolbox down'])
  walkTo(h, a, lane)
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Inspect the sagging hinge'])
  act(h, a, 'inspect')
  assert.deepEqual(a.messages.at(-1), { type: 'gate-step', step: 'inspected' })
  walkTo(h, a, ...toBench, byBench)
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Take a hinge pin'])
  act(h, a, 'take-pin')
  assert.equal(a.state.gateRepair.pinHolder, 0)
  walkTo(h, a, ...benchRoad, lane)
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Fit the hinge pin'])
  act(h, a, 'fit')
  assert.deepEqual(a.state.gateRepair, { stage: 'fitted', pinHolder: null, acceptedAt: a.state.gateRepair.acceptedAt })
  assert.equal(a.state.gate.open, false)
  const coins = a.state.crewCoins
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Swing the gate to test it'])
  act(h, a, 'test')
  assert.equal(a.state.gateRepair.stage, 'mended')
  assert.equal(a.state.crewCoins, coins + 5)
  assert.deepEqual(a.state.residents.wren, { trust: 1, kept: ['wren-gate'], active: null })
  assert.deepEqual(a.state.lastFavorPay, { resident: 'wren', favor: 'wren-gate', coins: 5 })
  assert.deepEqual(a.messages.filter(({ type }) => type === 'favor-pay'),
    [{ type: 'favor-pay', resident: 'wren', favor: 'wren-gate', coins: 5, trust: 1 }])
  walkTo(h, a, garden, lane)
  assert.equal(a.state.items[toolboxId].holder, 0)
})

test('either crewmate can fit once the pin and toolbox meet at the gate, and racing presses pay once', (t) => {
  const h = setup(t, {
    players: [player(0, { x: gateway.x - .6, z: lane.z }), player(1, byBench)],
    arrange: repairStage('inspected', { arrange: (save) => { save.world.items[toolboxId].holder = 0 } }),
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.equal(canFit(a.state, a.player), false, 'no pin at the gate yet')
  choose(a, 'fit')
  h.advance()
  assert.equal(a.state.gateRepair.stage, 'inspected')
  act(h, b, 'take-pin')
  assert.equal(canFit(a.state, a.player), false, 'the pin is still at the depot')
  walkTo(h, b, ...benchRoad, { x: gateway.x + .6, z: lane.z })
  assert.equal(top(a), 'fit')
  assert.equal(top(b), 'fit')
  const coins = a.state.crewCoins
  choose(a, 'fit')
  choose(b, 'fit')
  h.advance()
  assert.equal(a.state.gateRepair.stage, 'fitted')
  assert.equal(a.state.crewCoins, coins)
  assert.equal(a.state.gate.open, false, 'a stale fit does not swing the gate')
  assert.equal(count(a, 'gate-step'), 1)
  choose(a, 'test')
  choose(b, 'test')
  h.advance()
  assert.equal(a.state.crewCoins, coins + 5)
  assert.equal(a.state.residents.wren.trust, 1)
  assert.equal(count(a, 'favor-pay'), 1)
  assert.equal(count(b, 'favor-pay'), 1)
  assert.equal(a.state.gate.open, true)
  walkTo(h, b, gateway, garden)
  walkTo(h, a, gateway)
  assert.ok(!interactions(a.state, a.player).some(({ action }) => action === 'close'), 'hands full of toolbox')
  assert.equal(top(b), 'close')
  act(h, b, 'close')
  h.advance(10)
  assert.equal(a.state.gate.open, true, 'the gate waits while a crewmate stands in the opening')
  walkTo(h, a, { x: gateway.x, z: fenceZ - 1.6 })
  h.advance()
  assert.equal(a.state.gate.open, false)
})

test('fit refuses a pin or toolbox that is not at the gate', () => {
  const base = createGame().snapshotForSave().world
  const crew = (overrides) => [0, 1].map((id) => player(id, lane, overrides[id]))
  const state = (players, pinHolder, toolbox) => ({
    ...initialGateRepair(), islandTime: at(12), gateRepair: { stage: 'inspected', pinHolder },
    players, items: base.items.map((item) => item.kind === 'toolbox' ? { ...item, ...toolbox } : item),
  })
  const ready = crew({})
  assert.equal(canFit(state(ready, 1, { holder: 0 }), ready[0]), true)
  assert.equal(canFit(state(ready, 1, { ...toolboxHome, holder: null }), ready[0]), false, 'toolbox left on the bench')
  assert.equal(canFit(state(ready, 1, { x: gateway.x + 2.6, z: lane.z, holder: null }), ready[0]), false, 'toolbox too far')
  assert.equal(canFit(state(ready, 1, { ...lane, holder: null }), ready[0]), true, 'toolbox set down by the gate')
  const away = crew({ 1: { connected: false } })
  assert.equal(canFit(state(away, 1, { holder: 0 }), away[0]), false, 'pin with a disconnected partner')
  const depot = crew({ 1: { ...byBench } })
  assert.equal(canFit(state(depot, 1, { holder: 0 }), depot[0]), false, 'pin still at the depot')
  assert.equal(canFit(state(depot, 1, { holder: 1 }), depot[0]), false, 'toolbox carried at the depot')
})

test('stale, out-of-range or malformed choices change nothing, and E at the board still opens the board', (t) => {
  const h = setup(t, {
    players: [player(0, lane), player(1, byBench)],
    arrange: repairStage('accepted', { arrange: (save) => { save.world.mission = 'complete' } }),
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  b.request('interact', { choice: { action: 'pick-up', subject: 'all' } })
  h.advance()
  assert.equal(b.state.items.some(({ holder }) => holder === 1), false, 'a malformed subject is dropped, not read as a bare press')
  choose(b, 'inspect')
  h.advance()
  assert.equal(b.state.gateRepair.stage, 'accepted', 'out of range')
  choose(b, 'not-an-action')
  h.advance()
  assert.equal(b.state.gateRepair.stage, 'accepted', 'an unknown action is dropped')
  assert.equal(interactRequest(a.state, player(0, { x: jobBoard.x, z: jobBoard.z - 1.2 })), 'open-job-board')
  act(h, a, 'inspect')
  choose(a, 'inspect')
  h.advance()
  assert.equal(count(a, 'gate-step'), 1)
})

test('a carrier who drops out loses the pin at once, Wren recalls the toolbox, and a reused slot inherits nothing', (t) => {
  const h = setup(t, {
    players: [player(0, lane), player(1, byWren)],
    arrange: repairStage('inspected', { pinHolder: 0, arrange: (save) => { save.world.items[toolboxId].holder = 0 } }),
  })
  let a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.close()
  h.advance()
  assert.equal(b.state.gateRepair.pinHolder, null, 'the pin goes back to the bench')
  assert.equal(b.state.items[toolboxId].holder, 0)
  assert.match(gateRepairGuide(b.state, b.player).next, /partner left with the toolbox/)
  a = h.join(tokens[0])
  assert.equal(a.state.items[toolboxId].holder, 0, 'reconnecting before a recall keeps the toolbox')
  a.close()
  act(h, b, 'talk')
  assert.deepEqual(b.messages.filter(({ type }) => type === 'gate-step').at(-1), { type: 'gate-step', step: 'recalled' })
  assert.ok(onBench(b.state.items[toolboxId]))
  a = h.join(tokens[0])
  assert.equal(a.state.items.filter((item) => item.kind === 'toolbox' && item.holder !== null).length, 0)
  walkTo(h, b, benchRoad[0], byBench)
  assert.deepEqual(interactions(b.state, b.player).map(({ action }) => action).slice(0, 2), ['take-pin', 'pick-up'])
  b.request('interact', { choice: { action: 'pick-up', subject: toolboxId } })
  h.advance()
  assert.equal(b.state.items[toolboxId].holder, 1, 'aiming at the toolbox picks it up instead of the default pin')
  b.close()
  h.elapse(12_100)
  const c = h.join(tokens[2])
  assert.equal(c.player.id, 1, 'the expired slot is reused')
  assert.equal(c.state.items[toolboxId].holder, null)
  assert.equal(c.state.gateRepair.pinHolder, null)
  assert.ok(distance(c.state.items[toolboxId], byBench) < 1 && !onBench(c.state.items[toolboxId]), 'dropped where the carrier stood')
  assert.equal(c.state.items.filter((item) => item.kind === 'toolbox').length, 1)
})

test('a crewmate joining mid-job sees who needs help, where the toolbox is and what to do next', (t) => {
  const h = setup(t, {
    players: [player(0, lane), player(1, byWren)],
    arrange: repairStage('inspected', { arrange: (save) => { save.world.items[toolboxId].holder = 0 } }),
  })
  h.join(tokens[0])
  const b = h.join(tokens[1])
  const guide = gateRepairGuide(b.state, b.player)
  assert.equal(guide.title, 'Wren’s gate')
  assert.match(guide.detail, /top hinge is loose/)
  assert.match(guide.next, /Your partner has the toolbox/)
  assert.match(guide.next, /hinge pin at the mending bench by the ferry/)
  const done = { ...b.state, gateRepair: { stage: 'mended', pinHolder: null, mendedAt: b.state.islandTime } }
  assert.match(gateRepairGuide(done, b.player).next, /tomorrow morning/)
  assert.match(gateRepairGuide({ ...done, islandTime: done.islandTime + daySeconds }, b.player).next, /Wren uses the gate now/)
})

test('partial and finished repairs survive a host restart; the next dawn changes Wren’s route and greeting only once', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-gate-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const h = setup(t, {
    players: [player(0, lane)],
    arrange: repairStage('inspected', { pinHolder: 0, arrange: (save) => { save.world.items[toolboxId].holder = 0 } }),
  })
  h.join(tokens[0])
  file.write(h.game.snapshotForSave())
  const partial = file.load()
  assert.equal(partial.world.gateRepair.stage, 'inspected')
  const resumed = setup(t, { saved: partial })
  const a = resumed.join(tokens[0])
  assert.equal(a.state.gateRepair.pinHolder, null, 'the pin is back on the bench after a restart')
  assert.equal(a.state.items[toolboxId].holder, 0)

  const finished = createGame().snapshotForSave()
  finished.islandTime = at(10)
  Object.assign(finished.world, { gateRepair: { stage: 'mended', pinHolder: null, acceptedAt: at(8), mendedAt: at(10) },
    residents: { ...finished.world.residents, wren: { trust: 1, kept: ['wren-gate'], active: null } },
    lastFavorPay: { resident: 'wren', favor: 'wren-gate', coins: 5 }, crewCoins: 5 })
  finished.crewCoins = 5
  file.write(finished)
  assert.deepEqual(file.load(), finished)
  const kept = ['wren-gate']
  assert.deepEqual(wrenLines({ ...finished.world, islandTime: at(17) }, kept)[0], wrenLines({ ...finished.world, islandTime: at(11) }, kept)[0])
  const morning = { ...file.load(), islandTime: at(6.95, 1) }
  const next = setup(t, { saved: morning, players: [] })
  const c = next.join(tokens[0])
  assert.match(wrenLines(c.state, c.state.residents.wren.kept)[0], /won’t forget who fixed it/)
  next.advanceUntil(() => c.state.gate.open, 200)
  assert.ok(distance(wrenAt(c.state), gateway) < 1.5, 'Wren opens the mended gate on the way out')
  next.advanceUntil(() => !c.state.gate.open, 400)
  assert.ok(distance(wrenAt(c.state), gateway) >= 1.5)
  choose(c, 'test')
  choose(c, 'talk')
  next.advance()
  assert.equal(c.state.crewCoins, 5)
  assert.equal(c.state.residents.wren.trust, 1)
})

test('older saves gain the toolbox and gate defaults, and rejected gate data does not load', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-gate-save-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const current = createGame().snapshotForSave()
  const legacy = { ...JSON.parse(JSON.stringify(current)), version: 2 }
  legacy.world.items = legacy.world.items.slice(0, toolboxId)
  for (const key of ['gate', 'gateRepair', 'residents']) delete legacy.world[key]
  file.write(legacy)
  const migrated = file.load()
  assert.equal(migrated.version, 5)
  const { gate, gateRepair, residents } = migrated.world
  assert.deepEqual({ gate, gateRepair }, initialGateRepair())
  assert.deepEqual(residents, current.world.residents)
  assert.ok(onBench(migrated.world.items[toolboxId]))
  assert.equal(migrated.world.items[toolboxId].kind, 'toolbox')
  for (const broken of [{ gateRepair: { stage: 'mended', pinHolder: null } }, { gate: { open: 'yes', closePending: false } },
    { residents: { wren: { trust: -1, kept: [], active: null } } }, { gateRepair: { stage: 'polished', pinHolder: null } }]) {
    file.write({ ...current, world: { ...current.world, ...broken } })
    assert.throws(() => file.load(), /Could not load island save/)
  }
})

test('the toolbox goes home from an unsafe respawn, and the repair sites stay clear of the freight yard', (t) => {
  const h = setup(t, {
    players: [player(0, coastPoint(Math.PI, 1.07))],
    arrange: repairStage('accepted', { arrange: (save) => { save.world.items[toolboxId].holder = 0 } }),
  })
  const a = h.join(tokens[0])
  a.request('respawn')
  h.advance()
  assert.ok(onBench(a.state.items[toolboxId]))
  const stack = starterFeatures.find(({ name }) => name === 'Depot freight stack')
  assert.ok(distance(mendingBench, stack) > 3)
  const { x, z, w, d } = wrenCottage
  for (const site of [mendingBench, ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x: x + sx * (w / 2 + .6), z: z + sz * d / 2 }))), { x, z: fenceZ }]) {
    assert.ok(coastRadius(site) <= shoreProfile[1].radius, `on grass, not sand: ${site.x}, ${site.z}`)
  }
  for (const site of [gateway, mendingBench, wrenAt({ gateRepair: { stage: 'sagging', pinHolder: null }, islandTime: at(12) }), toolboxHome]) {
    for (const crate of crateStarts) assert.ok(distance(site, crate) > 2.7 + 2.5, 'crate pick-up stays separate')
    assert.ok(distance(site, jobBoard) > 5)
  }
  assert.ok(distance(toolboxHome, gateway) > 2.5, 'the toolbox has to be brought to the gate')
})
