import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { actionHint } from '../src/actions.ts'
import { deckTop, ferryStages, initialFerryRepair, tallyLines } from '../src/ferry-repair.ts'
import { interactions } from '../src/interaction-options.ts'
import { distance } from '../src/world.ts'
import { tallyBoard, timberPickups, yardDrop } from '../src/worlds/starter/ferry-terminal.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const atTally = { x: tallyBoard.x, z: tallyBoard.z + 1.3 }
const inYard = { x: yardDrop.x, z: yardDrop.z + 1 }
const atTimber = { x: timberPickups[1].x, z: timberPickups[1].z - 1.6 }
const full = (i) => ({ coins: [ferryStages[i].coins - 4, 4], crates: [1, ferryStages[i].crates - 1] })

const choose = (client, action, subject) => client.request('interact', { choice: { action, subject } })
const offered = (client) => interactions(client.state, client.player).map(({ action }) => action)
const count = (client, type) => client.messages.filter((message) => message.type === type).length

// A crew that has finished the starter shift and the four harbor orders that open the repair.
function ready({ coins = 30, completed = 4, repair, holding, arrange } = {}) {
  return (save) => {
    save.crewCoins = coins
    save.world.mission = 'complete'
    save.world.jobs = { active: null, completed }
    for (const item of save.world.items) if (item.kind === 'crate') item.delivered = true
    if (repair) save.world.ferryRepair = repair
    if (holding !== undefined) Object.assign(save.world.items[0], { holder: holding, delivered: false })
    arrange?.(save)
  }
}

test('the tally board introduces the repair at four orders, and E alone never spends the crew bank', (t) => {
  const early = setup(t, { players: [player(0, atTally)], arrange: ready({ completed: 3 }) })
  const a = early.join(tokens[0])
  assert.deepEqual(offered(a), ['ferry-tally', 'record'])
  assert.match(tallyLines(a.state).lines[0], /finished 4 harbor orders \(3\/4\)/)
  a.request('interact')
  early.advance()
  assert.equal(count(a, 'ferry-tally'), 1)

  const h = setup(t, { players: [player(0, atTally)], arrange: ready() })
  const b = h.join(tokens[0])
  assert.deepEqual(offered(b), ['ferry-order', 'ferry-donate', 'ferry-tally', 'record'])
  assert.deepEqual(actionHint(b.state, b.player), ['E', 'Order 2 timber crates from Seabrook'])
  b.request('interact')
  h.advance()
  assert.equal(b.state.crewCoins, 30, 'a press with no choice reads the board')
  assert.equal(b.state.ferryRepair.haul, 0)
  assert.equal(count(b, 'ferry-tally'), 1)
})

test('donations debit the crew bank, name the donor, and racing presses cannot overshoot the stage', (t) => {
  const h = setup(t, { players: [player(0, atTally), player(1, { x: atTally.x + .8, z: atTally.z })], arrange: ready({ coins: 9 }) })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  choose(a, 'ferry-donate')
  h.advance()
  assert.equal(a.state.crewCoins, 4)
  assert.deepEqual(a.state.ferryRepair.ledger[0].coins, [5, 0])
  assert.deepEqual(b.messages.at(-1), { type: 'ferry-progress', kind: 'coins', player: 0, amount: 5 })
  assert.match(tallyLines(b.state).lines[1], /Blue cottage|Amber cottage|: 5 coins/)
  choose(a, 'ferry-donate')
  choose(b, 'ferry-donate')
  h.advance()
  assert.equal(a.state.crewCoins, 0, 'the second press finds an empty bank and gives nothing')
  assert.deepEqual(a.state.ferryRepair.ledger[0].coins, [9, 0])
  assert.ok(!offered(b).includes('ferry-donate'))
})

test('a timber order stages crates at Seabrook, holds back delivery orders, and credits whoever stacks each crate', (t) => {
  const h = setup(t, { players: [player(0, atTally), player(1, atTimber)], arrange: ready() })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  choose(a, 'ferry-order')
  h.advance(20)
  assert.equal(a.state.ferryRepair.haul, 2)
  assert.deepEqual(b.messages.at(-1), { type: 'ferry-order', crates: 2 })
  assert.ok([0, 1].every((id) => distance(a.state.items[id], timberPickups[id]) < .6 && !a.state.items[id].delivered))
  assert.ok(a.state.items[2].delivered, 'only the crates the stage needs are staged')
  assert.ok(!offered(a).includes('ferry-order'), 'one haul at a time')
  b.request('take-job', { id: 'farm-supplies' })
  h.advance()
  assert.deepEqual(b.messages.at(-1), { type: 'order-unavailable' })
  assert.ok(offered(b).includes('pick-up'), 'timber can be picked up while no delivery is running')

  const yard = setup(t, {
    players: [player(0, inYard)],
    arrange: ready({ repair: { ...initialFerryRepair().ferryRepair, haul: 2 }, holding: 0,
      arrange: (save) => { save.world.items[1].delivered = false } }),
  })
  const c = yard.join(tokens[0])
  assert.deepEqual(actionHint(c.state, c.player), ['E', 'Stack timber for the ferry repair'])
  c.request('interact')
  yard.advance()
  assert.equal(c.state.items[0].delivered, true)
  assert.equal(c.state.ferryRepair.haul, 1)
  assert.deepEqual(c.state.ferryRepair.ledger[0].crates, [1, 0])
  assert.deepEqual(c.messages.at(-1), { type: 'ferry-progress', kind: 'timber', player: 0, amount: 1 })
})

test('the last coin and crate finish the stage once, restore service, and survive a host restart', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-ferry-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const repair = { stage: 2, ledger: [full(0), full(1), { coins: [7, 0], crates: [1, 0] }], haul: 1 }
  const h = setup(t, { players: [player(0, inYard), player(1, atTally)], arrange: ready({ coins: 20, repair, holding: 0 }) })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('interact')
  h.advance()
  assert.equal(a.state.ferryRepair.stage, 2, 'timber alone does not finish a stage that still needs coins')
  choose(b, 'ferry-donate')
  choose(b, 'ferry-donate')
  h.advance()
  assert.equal(b.state.crewCoins, 15)
  assert.equal(b.state.ferryRepair.stage, ferryStages.length)
  assert.ok(Number.isFinite(b.state.ferryRepair.restoredAt))
  assert.equal(b.state.ferryRepair.ledger.length, ferryStages.length)
  for (const client of [a, b]) assert.deepEqual(client.messages.filter(({ type }) => type === 'ferry-stage'), [{ type: 'ferry-stage', stage: 3 }])
  assert.deepEqual(offered(b), ['ferry-tally', 'record'])

  file.write({ ...h.game.snapshotForSave(), world: { ...h.game.snapshotForSave().world, truck: { x: -30, z: -42, heading: Math.PI } } })
  const resumed = setup(t, { saved: file.load() })
  const c = resumed.join(tokens[1])
  assert.ok(c.state.truck.y > deckTop(c.state.truck) - .05, 'a truck saved on the ramp parks on the deck')
  assert.equal(c.state.ferryRepair.stage, ferryStages.length)
  assert.equal(c.state.crewCoins, 15)
  assert.equal(tallyLines(c.state).title, 'Ferry terminal · Service restored')
  assert.match(tallyLines(c.state).lines[2], /Open the ramp · Amber cottage: 12 coins, 2 timber crates|Open the ramp/)
})

test('a partner finishes a haul after the carrier drops out', (t) => {
  const h = setup(t, {
    players: [player(0, inYard), player(1, { x: inYard.x + 1.2, z: inYard.z })],
    arrange: ready({ repair: { ...initialFerryRepair().ferryRepair, haul: 1 }, holding: 0 }),
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.close()
  h.elapse(13000)
  h.advance(30)
  const crate = b.state.items[0]
  assert.equal(crate.holder, null, 'the crate drops where the carrier stood')
  choose(b, 'pick-up', 0)
  h.advance()
  assert.equal(b.state.items[0].holder, 1)
  b.request('interact')
  h.advance()
  assert.deepEqual(b.state.ferryRepair.ledger[0].crates, [0, 1])
  assert.equal(b.state.ferryRepair.haul, 0)
})

test('older saves start the repair untouched, and progress that does not add up is rejected', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-ferry-save-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const current = createGame().snapshotForSave()
  const legacy = { ...JSON.parse(JSON.stringify(current)), version: 4 }
  delete legacy.world.ferryRepair
  file.write(legacy)
  const migrated = file.load()
  assert.equal(migrated.version, 6)
  assert.deepEqual(migrated.world.ferryRepair, initialFerryRepair().ferryRepair)
  for (const ferryRepair of [
    { stage: 1, ledger: [full(0)], haul: 0 },
    { stage: 0, ledger: [{ coins: [13, 0], crates: [0, 0] }], haul: 0 },
    { stage: 0, ledger: [{ coins: [0, 0], crates: [1, 0] }], haul: 2 },
    { stage: 0, ledger: [{ coins: [0], crates: [0] }], haul: 0 },
    { stage: 3, ledger: [full(0), full(1), full(2)], haul: 0 },
    { stage: 0, ledger: [{ coins: [0, 0], crates: [0, 0] }], haul: 4 },
    { stage: 1, ledger: [{ coins: [1, 0], crates: [2, 0] }, { coins: [0, 0], crates: [0, 0] }], haul: 0 },
  ]) {
    file.write({ ...current, world: { ...current.world, ferryRepair } })
    assert.throws(() => file.load(), /Could not load island save/, JSON.stringify(ferryRepair))
  }
  const restored = { stage: 3, ledger: [full(0), full(1), full(2)], haul: 0, restoredAt: 0 }
  file.write({ ...current, world: { ...current.world, ferryRepair: restored } })
  assert.deepEqual(file.load().world.ferryRepair, restored)
})
