import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { fenceZ, gateway, toolboxItem, wrenAt, wrenLendsToolbox } from '../src/gate-repair.ts'
import { interactions } from '../src/interaction-options.ts'
import { swellGuide } from '../src/gate-swell.ts'
import { favorFeedback } from '../src/resident-notices.ts'
import { conversationLines, favorLine } from '../src/residents/favors.ts'
import { blankRecord, breakPromise, keepFavor, standingOf } from '../src/residents/trust.ts'
import { walkingHeight } from '../src/terrain.ts'
import { daySeconds } from '../src/weather.ts'
import { distance, itemStarts, mendingBench } from '../src/world.ts'
import { starterResidents } from '../src/worlds/starter/residents.ts'
import { wren } from '../src/worlds/starter/residents/wren.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const at = (hour, day = 0) => day * daySeconds + ((hour - 6 + 24) % 24) * daySeconds / 24
const WREN = starterResidents.indexOf(wren)
const toolboxId = itemStarts.findIndex(({ kind }) => kind === 'toolbox')
const byWren = { x: mendingBench.x - 2.1, z: mendingBench.z + .8 }
const atTheGate = { x: gateway.x, z: fenceZ - .9 }
const choose = (client, action, subject) => client.request('interact', { choice: { action, ...subject !== undefined && { subject } } })
const has = (client, action) => interactions(client.state, client.player).some((option) => option.action === action)
const notices = (client, type) => client.messages.filter((message) => message.type === type)

// Two days after the first repair: the gate has settled, Wren trusts the crew once and is at the bench.
// One crewmate waits by Wren, the other at the gate with the toolbox set down beside it.
function afterFirstRepair(save, { record = {}, swelling } = {}) {
  save.islandTime = at(10, 2)
  Object.assign(save.world, { mission: 'complete', fire: 0 })
  Object.assign(save.world.gateRepair, { stage: 'mended', acceptedAt: 0, mendedAt: at(9), ...swelling && { swelling } })
  save.world.residents.wren = { ...blankRecord(), trust: 1, kept: ['wren-gate'], ...record }
  Object.assign(save.world.items[toolboxId], { x: gateway.x + 1, z: fenceZ - 1.2, holder: null })
}

function crew(t, options = {}, goods = { fish: 2, carrots: 2 }) {
  const players = [player(0, byWren, { y: walkingHeight(byWren), goods: { ...goods } }), player(1, atTheGate, { y: walkingHeight(atTheGate) })]
  const h = setup(t, { players, arrange: (save) => afterFirstRepair(save, options) })
  return { h, a: h.join(tokens[0]), b: h.join(tokens[1]) }
}

function act(h, client, action, subject) {
  choose(client, action, subject)
  h.advance()
}

test('Wren asks about the swollen gate, and the crew checks, planes and reports it honestly', (t) => {
  const { h, a, b } = crew(t)
  assert.ok(distance(wrenAt(a.state), mendingBench) < 2, 'Wren is at work')
  assert.match(favorLine(wren, a.state), /swollen the gate/)
  act(h, a, 'accept-favor', WREN)
  assert.equal(a.state.gateRepair.swelling, 'swollen')
  assert.equal(a.state.residents.wren.active, 'wren-swell')
  assert.ok(!has(a, 'report-sound'), 'nothing to report before anyone has checked')
  assert.match(swellGuide(b.state, b.player).next, /Swing the gate to see where it catches/)

  act(h, b, 'check-swing')
  assert.equal(b.state.residents.wren.checked, 'fault')
  for (const client of [a, b]) assert.deepEqual(notices(client, 'gate-step').at(-1), { type: 'gate-step', step: 'caught' })
  assert.match(favorLine(wren, a.state), /caught on the swollen edge/, 'whoever reports back knows what the crew saw')
  assert.match(swellGuide(a.state, a.player).next, /Plane the edge at the gate/)

  // Owning up costs nothing.
  act(h, a, 'report-fault', WREN)
  assert.equal(a.state.residents.wren.trust, 1)
  assert.equal(standingOf(a.state.residents.wren), 'steady')
  assert.match(favorFeedback(notices(b, 'favor-report')[0], 1).label, /^Your crewmate told Wren the work still needs fixing · No penalty/)

  act(h, b, 'plane')
  assert.equal(b.state.gateRepair.swelling, 'planed')
  assert.equal(b.state.residents.wren.checked, null)
  assert.match(swellGuide(b.state, b.player).next, /check the planed edge/)
  act(h, b, 'check-swing')
  assert.equal(b.state.residents.wren.checked, 'sound')
  assert.equal(swellGuide(a.state, a.player).next, 'Tell Wren the gate is fixed.')
  const coins = a.state.crewCoins
  act(h, a, 'report-sound', WREN)
  assert.equal(a.state.crewCoins, coins + 5)
  assert.deepEqual(a.state.residents.wren, { ...blankRecord(), trust: 2, kept: ['wren-gate', 'wren-swell'] })
  assert.equal(a.state.gateRepair.swelling, undefined, 'the gate swings clear again')
  assert.match(favorLine(wren, a.state), /fish pie/, 'Wren moves on to the next favor')
})

test('a false report breaks the promise once, both players learn of it, and it survives a restart', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-trust-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const { h, a, b } = crew(t, { record: { active: 'wren-swell', trust: 3 }, swelling: 'swollen' })
  act(h, b, 'check-swing')
  act(h, a, 'report-sound', WREN)
  const record = a.state.residents.wren
  assert.equal(record.trust, 1, 'one breach costs two favors of trust')
  assert.equal(standingOf(record), 'wronged')
  assert.equal(record.active, 'wren-swell', 'the job is still there to put right')
  assert.equal(a.state.gateRepair.swelling, 'swollen')
  for (const client of [a, b]) {
    assert.deepEqual(notices(client, 'favor-report').map(({ result, trust }) => [result, trust]), [['broken', -2]])
  }
  assert.match(favorFeedback(notices(b, 'favor-report')[0], 1).label, /Your crewmate told Wren it was fixed, but it wasn’t · Wren trust −2/)
  assert.ok(!has(a, 'report-sound'), 'the finding clears, so the same lie cannot be told twice')

  // Wren goes round the back again, and says why to anyone, including a partner who comes back after a restart.
  assert.notDeepEqual(wrenAt({ ...a.state, islandTime: at(7.1, 3) }), wrenAt({ ...a.state, islandTime: at(7.1, 3), gateRepair: { ...a.state.gateRepair, swelling: undefined } }))
  file.write(h.game.snapshotForSave())
  const resumed = setup(t, { saved: file.load() })
  const partner = resumed.join(tokens[1])
  assert.match(conversationLines(wren, partner.state)[0], /You told me it swung clear/)
  assert.equal(partner.state.residents.wren.breach.amended, false)
})

test('either crewmate makes amends, Wren stays wary, and two kept favors later Wren relies on the crew again', (t) => {
  const breach = { favor: 'wren-swell', at: at(9, 2), amended: false, rebuilt: 0 }
  const { h, a, b } = crew(t, { record: { active: 'wren-swell', trust: 0, breach }, swelling: 'swollen' })
  assert.equal(toolboxItem(a.state).holder, null)
  act(h, b, 'check-swing')
  act(h, b, 'plane')
  act(h, b, 'check-swing')
  const coins = a.state.crewCoins
  act(h, a, 'report-sound', WREN)
  assert.equal(a.state.crewCoins, coins + 5, 'the work is paid')
  assert.equal(a.state.residents.wren.trust, 0, 'putting it right earns no trust')
  assert.equal(standingOf(a.state.residents.wren), 'wary')
  assert.deepEqual(notices(a, 'favor-pay').at(-1), { type: 'favor-pay', resident: 'wren', favor: 'wren-swell', coins: 5, trust: 0, restored: false })
  assert.match(favorFeedback(notices(b, 'favor-pay').at(-1), 1).label, /Put right\. Wren will still check your work/)
  assert.match(conversationLines(wren, a.state)[0], /look at the next job myself/)
  assert.equal(wrenLendsToolbox(a.state), false)

  act(h, a, 'accept-favor', WREN)
  act(h, a, 'hand-over', WREN)
  assert.equal(standingOf(a.state.residents.wren), 'wary', 'one kept favor is not enough yet')
  act(h, a, 'accept-favor', WREN)
  act(h, a, 'hand-over', WREN)
  const record = a.state.residents.wren
  assert.equal(standingOf(record), 'steady')
  assert.equal(record.forgiven, 1)
  assert.equal(record.trust, 3, 'two kept favors and the restored reliance')
  assert.equal(notices(b, 'favor-pay').at(-1).restored, true)
  assert.match(favorFeedback(notices(b, 'favor-pay').at(-1), 1).label, /Wren relies on the crew again/)
  assert.match(conversationLines(wren, a.state)[0], /stopped checking your work/)
  assert.equal(wrenLendsToolbox(a.state), true, 'the toolbox is the crew’s to borrow')
})

test('a declined favor, a disconnect mid-job and a failed swing never cost trust', (t) => {
  const { h, a, b } = crew(t)
  act(h, b, 'open')
  assert.equal(a.state.residents.wren.trust, 1, 'walking away from the offer')
  act(h, a, 'accept-favor', WREN)
  act(h, b, 'check-swing')
  b.close()
  h.elapse(15_000)
  assert.equal(a.state.residents.wren.trust, 1)
  assert.equal(standingOf(a.state.residents.wren), 'steady')
  assert.equal(a.state.residents.wren.checked, 'fault', 'the crew still knows what it saw')
})

test('the ledger rules hold on their own: one breach at a time, amends only on the broken favor', () => {
  const state = { residents: { wren: { ...blankRecord(), trust: 1, active: 'wren-swell' } }, crewCoins: 0, islandTime: 10 }
  const [swell, pie] = ['wren-swell', 'wren-pie'].map((id) => wren.favors.find((favor) => favor.id === id))
  assert.equal(breakPromise(state, wren, swell), 1, 'trust never goes below zero')
  assert.equal(breakPromise(state, wren, swell), null, 'no second breach before amends')
  assert.equal(breakPromise(state, wren, pie), null, 'only the favor under way can be broken')
  assert.equal(keepFavor(state, wren, swell).trust, 0)
  assert.equal(keepFavor(state, wren, swell), null)
})

test('version 4 records gain an empty trust history, and inconsistent breaches or findings do not load', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-trust-save-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const current = createGame().snapshotForSave()
  const v4 = JSON.parse(JSON.stringify(current))
  v4.version = 4
  v4.world.residents = { mara: { trust: 1, kept: ['mara-supper'], active: null } }
  file.write(v4)
  const migrated = file.load()
  assert.equal(migrated.version, 6)
  assert.deepEqual(migrated.world.residents.mara, { ...blankRecord(), trust: 1, kept: ['mara-supper'] })

  const swollen = { gateRepair: { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: 0, swelling: 'swollen' } }
  const wrenWith = (record) => ({ residents: { ...current.world.residents, wren: { ...blankRecord(), kept: ['wren-gate'], ...record } } })
  const breach = (extra) => ({ favor: 'wren-swell', at: 0, amended: false, rebuilt: 0, ...extra })
  file.write({ ...current, world: { ...current.world, ...swollen, ...wrenWith({ active: 'wren-swell', checked: 'fault', breach: breach() }) } })
  assert.equal(file.load().world.residents.wren.breach.amended, false)
  for (const broken of [
    wrenWith({ checked: 'fault' }),
    wrenWith({ breach: breach({ amended: true }) }),
    wrenWith({ active: 'wren-swell', breach: breach({ rebuilt: 1 }) }),
    wrenWith({ kept: ['wren-gate', 'wren-swell'], breach: breach({ amended: true, rebuilt: 2 }) }),
    wrenWith({ forgiven: -1 }),
    { gateRepair: { stage: 'sagging', pinHolder: null, swelling: 'swollen' } },
  ]) {
    file.write({ ...current, world: { ...current.world, ...broken } })
    assert.throws(() => file.load(), /Could not load island save/, JSON.stringify(broken))
  }
})
