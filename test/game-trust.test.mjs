import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { createPlaytestMetrics } from '../server/playtest-metrics.ts'
import { islandSaveFile } from '../server/save.ts'
import { interactRequest } from '../src/actions.ts'
import { fenceZ, gateFavor, gateway, onBench, toolboxItem, wrenAt, wrenLendsToolbox } from '../src/gate-repair.ts'
import { interactions } from '../src/interaction-options.ts'
import { interactionChoice } from '../src/interactions/definition.ts'
import { swellGuide } from '../src/gate-swell.ts'
import { favorFeedback } from '../src/resident-notices.ts'
import { conversationLines, favorLine, openOffer } from '../src/residents/favors.ts'
import { blankRecord, breakPromise, keepFavor, standingOf } from '../src/residents/trust.ts'
import { walkingHeight } from '../src/terrain.ts'
import { daySeconds } from '../src/weather.ts'
import { repairQuantity } from '../src/materials-work.ts'
import { distance, itemStarts, mendingBench } from '../src/world.ts'
import { starterResidents } from '../src/worlds/starter/residents.ts'
import { benchLunchFavor, repairSupplyFavor, wren } from '../src/worlds/starter/residents/wren.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const at = (hour, day = 0) => day * daySeconds + ((hour - 6 + 24) % 24) * daySeconds / 24
const WREN = starterResidents.indexOf(wren)
const toolboxId = itemStarts.findIndex(({ kind }) => kind === 'toolbox')
const byWren = { x: mendingBench.x - 2.1, z: mendingBench.z + 0.8 }
const atTheGate = { x: gateway.x, z: fenceZ - 0.9 }
const establishedFavors = [gateFavor, repairSupplyFavor.id, benchLunchFavor]
function choose(client, action, subject) {
  const option = interactions(client.state, client.player).find((entry) => entry.action === action && entry.subject === subject)
  client.request('interact', { choice: interactionChoice(option ?? { action, subject }) })
}
const has = (client, action) => interactions(client.state, client.player).some((option) => option.action === action)
const notices = (client, type) => client.messages.filter((message) => message.type === type)

// Two days after the first repair: the gate has settled, Wren trusts the crew once and is at the bench.
// One crewmate waits by Wren, the other at the gate with the toolbox set down beside it.
function afterFirstRepair(save, { record = {}, swelling, established = false } = {}) {
  save.islandTime = at(10, 2)
  Object.assign(save.world, { mission: 'complete', fire: 0 })
  Object.assign(save.world.gateRepair, { stage: 'mended', acceptedAt: 0, mendedAt: at(9), ...swelling && { swelling } })
  save.world.residents.wren = { ...blankRecord(), trust: established ? establishedFavors.length : 1, kept: established ? [...establishedFavors] : [gateFavor], ...record }
  if (established) {
    save.world.materialsWork.checkout = 'qualified'
    save.world.materialsWork.request = { material: 'timber', delivered: repairQuantity }
  }
  Object.assign(save.world.items[toolboxId], { x: gateway.x + 1, z: fenceZ - 1.2, holder: null })
}

function crew(t, options = {}, goods = { fish: 2, carrots: 2 }, metrics) {
  const players = [player(0, byWren, { y: walkingHeight(byWren), goods: { ...goods } }), player(1, atTheGate, { y: walkingHeight(atTheGate) })]
  const h = setup(t, { players, metrics, arrange: (save) => afterFirstRepair(save, options) })
  return { h, a: h.join(tokens[0]), b: h.join(tokens[1]) }
}

function act(h, client, action, subject) {
  choose(client, action, subject)
  h.advance()
}

test('Wren asks about the swollen gate, and the crew checks, planes and reports it honestly', (t) => {
  const recorded = []
  const { h, a, b } = crew(t, { established: true }, undefined, createPlaytestMetrics((event) => recorded.push(event))())
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
  assert.equal(a.state.residents.wren.trust, 3)
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
  assert.deepEqual(a.state.residents.wren, { ...blankRecord(), trust: 4, kept: [...establishedFavors, 'wren-swell'] })
  assert.equal(a.state.gateRepair.swelling, undefined, 'the gate swings clear again')
  assert.match(favorLine(wren, a.state), /fish pie/, 'Wren moves on to the next favor')
  assert.deepEqual(recorded.filter(({ event }) => event === 'wren-report').map(({ result, slot, trustChange }) => [result, slot, trustChange]), [
    ['honest', 0, 0],
  ])
})

test('a false report breaks the promise once, both players learn of it, and it survives a restart', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-trust-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const { h, a, b } = crew(t, { established: true, record: { active: 'wren-swell' }, swelling: 'swollen' })
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
  const { h, a, b } = crew(t, { established: true })
  act(h, b, 'open')
  assert.equal(a.state.residents.wren.trust, 3, 'walking away from the offer')
  act(h, a, 'accept-favor', WREN)
  act(h, b, 'check-swing')
  b.close()
  h.elapse(15_000)
  assert.equal(a.state.residents.wren.trust, 3)
  assert.equal(standingOf(a.state.residents.wren), 'steady')
  assert.equal(a.state.residents.wren.checked, 'fault', 'the crew still knows what it saw')
})

test('normal favors earn Wren’s loan, a breach revokes it, and both players can earn it back', (t) => {
  const recorded = []
  const newMetricsRun = createPlaytestMetrics((event) => recorded.push(event))
  const root = mkdtempSync(join(tmpdir(), 'mission-island-trust-arc-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const bench = { x: -24.3, z: -17.2 }
  const players = [
    player(0, bench, { goods: { fish: 0, carrots: 3 }, materials: { timber: repairQuantity, stone: 0 } }),
    player(1, atTheGate, { goods: { fish: 2, carrots: 2 } }),
  ]
  let h = setup(t, { players, metrics: newMetricsRun(), arrange(save) {
    const toolbox = { ...save.world.items[toolboxId] }
    afterFirstRepair(save)
    save.world.items[toolboxId] = toolbox
    save.world.materialsWork.checkout = 'qualified'
  } })
  let a = h.join(tokens[0]), b = h.join(tokens[1])
  const step = (client, action, subject) => act(h, client, action, subject)
  const pickup = (client) => interactions(client.state, client.player).find(({ action, subject }) => action === 'pick-up' && subject === toolboxId)
  const readStanding = (client) => standingOf(client.state.residents.wren)
  const route = [{ x: -31.6, z: -11.8 }, { x: -26.4, z: -13.4 }, { x: -24.3, z: -14.2 }]
  function walk(client, points) {
    for (const point of points) {
      for (let i = 0; i < 160 && distance(client.player, point) > 0.2; i++) {
        const gap = distance(client.player, point)
        h.input(client, { x: (point.x - client.player.x) / gap, z: (point.z - client.player.z) / gap })
        h.advance()
      }
      h.input(client)
      h.advance()
      assert.ok(distance(client.player, point) < 0.3, `Reached ${point.x}, ${point.z}`)
    }
  }
  assert.ok(onBench(toolboxItem(a.state)))
  assert.equal(pickup(a), undefined)
  step(a, 'choose-repair-material', 0)
  for (let i = 0; i < repairQuantity; i++) step(a, 'deliver-repair-material', 0)
  assert.equal(openOffer(wren, a.state)?.id, benchLunchFavor)
  step(a, 'accept-favor', WREN)
  const beforeLunch = a.state.crewCoins
  choose(a, 'hand-over', WREN)
  step(a, 'hand-over', WREN)
  assert.equal(a.state.crewCoins, beforeLunch + 3)
  assert.deepEqual(a.state.residents.wren.kept, establishedFavors)
  assert.equal(a.state.residents.wren.trust, 3)
  assert.equal(a.player.goods.carrots, 2)
  assert.equal(pickup(a)?.label, 'Pick up the toolbox')
  step(a, 'pick-up', toolboxId)
  assert.equal(toolboxItem(b.state).holder, a.player.id)
  step(a, 'return-toolbox')
  assert.ok(onBench(toolboxItem(a.state)))

  step(a, 'accept-favor', WREN)
  step(b, 'check-swing')
  step(a, 'report-sound', WREN)
  assert.equal(a.state.residents.wren.trust, 1)
  assert.equal(pickup(a), undefined)
  step(a, 'pick-up', toolboxId)
  assert.ok(onBench(toolboxItem(b.state)), 'the host rejects a stale free pickup')
  file.write(h.game.snapshotForSave())
  h = setup(t, { saved: file.load(), metrics: newMetricsRun() })
  b = h.join(tokens[1])
  assert.match(conversationLines(wren, b.state)[0], /You told me it swung clear/)
  a = h.join(tokens[0])
  assert.equal(readStanding(a), 'wronged')

  step(b, 'check-swing')
  assert.equal(pickup(a)?.label, 'Borrow the toolbox for the gate')
  step(a, 'pick-up', toolboxId)
  walk(a, [...route].reverse().concat(atTheGate))
  step(a, 'plane')
  step(a, 'check-swing')
  walk(b, [...route, bench])
  step(b, 'report-sound', WREN)
  assert.equal(readStanding(b), 'wary')
  assert.equal(b.state.residents.wren.trust, 1)
  walk(a, [...route, bench])
  step(a, 'return-toolbox')
  assert.equal(pickup(a), undefined)
  assert.equal(pickup(b), undefined)
  step(b, 'accept-favor', WREN)
  const pie = interactions(b.state, b.player).find(({ action }) => action === 'hand-over')
  const pieRequest = interactRequest(b.state, b.player, pie)
  assert.deepEqual(pieRequest, { type: 'interact', choice: { action: 'hand-over', subject: WREN, favor: 'wren-pie' } })
  step(b, 'hand-over', WREN)
  assert.equal(readStanding(a), 'wary')
  assert.equal(pickup(b), undefined)
  step(b, 'accept-favor', WREN)
  b.request(pieRequest.type, { choice: pieRequest.choice })
  h.advance()
  assert.equal(b.player.goods.carrots, 2, 'replaying the pie cannot hand over the soup ingredients')
  assert.equal(readStanding(b), 'wary')
  step(a, 'hand-over', WREN)
  assert.equal(readStanding(b), 'steady')
  for (const client of [a, b]) assert.equal(pickup(client)?.label, 'Pick up the toolbox')
  step(b, 'pick-up', toolboxId)
  assert.equal(toolboxItem(a.state).holder, b.player.id)

  assert.deepEqual(recorded.filter(({ event }) => event === 'wren-report').map(({ result, slot, trustChange }) => [result, slot, trustChange]), [
    ['broken', 0, -2],
  ])
  assert.deepEqual(recorded.filter(({ event }) => event === 'gate-step').map(({ step, slot }) => [step, slot]), [
    ['caught', 1],
    ['caught', 1],
    ['planed', 0],
    ['clear', 0],
  ])
  assert.deepEqual(recorded.filter(({ event }) => event === 'favor-paid').map(({ favor, slot, trustChange, restored }) => [favor, slot, trustChange, restored]), [
    [repairSupplyFavor.id, null, 1, false],
    [benchLunchFavor, 0, 1, false],
    ['wren-swell', 1, 0, false],
    ['wren-pie', 1, 1, false],
    ['wren-soup', 0, 2, true],
  ])
  const readings = recorded.filter(({ event }) => event === 'wren-state')
  assert.ok(readings.some(({ trust, freeLoan, toolboxHolder }) => trust === 3 && freeLoan && toolboxHolder === 0))
  assert.ok(readings.some(({ standing, freeLoan, swollenGateLoan }) => standing === 'wronged' && !freeLoan && swollenGateLoan))
  assert.ok(readings.some(({ standing, freeLoan }) => standing === 'wary' && !freeLoan))
  assert.deepEqual(readings.slice(-2).map(({ standing, freeLoan, toolboxHolder }) => [standing, freeLoan, toolboxHolder]), [
    ['steady', true, null],
    ['steady', true, 1],
  ])
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

test('the swollen-gate guide says where the toolbox really is, and how to get it back', (t) => {
  const { a } = crew(t, { record: { active: 'wren-swell' }, swelling: 'swollen' })
  const where = (toolbox) => swellGuide({ ...a.state, items: a.state.items.map((item, id) => id === toolboxId ? { ...item, ...toolbox } : item) }, a.player).next
  assert.match(where({}), /set down by the gate/)
  assert.match(where({ x: mendingBench.x, z: mendingBench.z + 0.42 }), /on Wren’s mending bench/)
  assert.match(where({ x: 0, z: 0 }), /left away from the gate\. Talk to Wren/)
  assert.match(where({ holder: 1 }), /Your crewmate has the toolbox/)
})
