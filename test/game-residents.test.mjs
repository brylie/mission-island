import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { createPlaytestMetrics } from '../server/playtest-metrics.ts'
import { islandSaveFile } from '../server/save.ts'
import { actionHint } from '../src/actions.ts'
import { interactions } from '../src/interaction-options.ts'
import { interactionChoice } from '../src/interactions/definition.ts'
import { favorFeedback } from '../src/resident-notices.ts'
import { conversationLines, favorGuides, favorLine, openOffer } from '../src/residents/favors.ts'
import { atResident, residentAt } from '../src/residents/schedule.ts'
import { blankRecord, initialResidents, keepFavor, trustTier } from '../src/residents/trust.ts'
import { canWalkAt } from '../src/simulation/movement.ts'
import { maxWadeDepth, walkingHeight, waterLevel } from '../src/terrain.ts'
import { dawnsBetween, daySeconds } from '../src/weather.ts'
import { crateStarts, distance } from '../src/world.ts'
import { starterResidents } from '../src/worlds/starter/residents.ts'
import { stagingBay } from '../src/worlds/starter/residents/bram.ts'
import { door, player, setup, tokens } from './support/game-harness.mjs'

const at = (hour, day = 0) => day * daySeconds + ((hour - 6 + 24) % 24) * daySeconds / 24
const subject = (id) => starterResidents.findIndex((resident) => resident.id === id)
const byId = (id) => starterResidents[subject(id)]
const sagging = { stage: 'sagging', pinHolder: null }
const settled = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: 0 }
function choose(client, action, id) {
  const index = subject(id)
  const option = interactions(client.state, client.player).find((entry) => entry.action === action && entry.subject === index)
  client.request('interact', { choice: interactionChoice(option ?? { action, subject: index }) })
}
const count = (client, type) => client.messages.filter((message) => message.type === type).length

// Two crewmates standing a step from a resident at work, mid-morning after the starter shift.
function beside(id, hour = 10) {
  const spot = residentAt(byId(id).schedule, { islandTime: at(hour), gateRepair: sagging })
  return [-0.9, 0.9].map((side, index) => player(index, { x: spot.x + side, z: spot.z + 0.6 }, { y: walkingHeight(spot) }))
}

function startAfterShift(t, id, { hour = 10, arrange, goods = [], metrics } = {}) {
  const players = beside(id, hour).map((entry, index) => ({ ...entry, goods: { fish: 0, carrots: 0, ...goods[index] } }))
  const h = setup(t, {
    players,
    metrics,
    arrange(save) {
      Object.assign(save.world, { mission: 'complete', fire: 0 })
      save.islandTime = at(hour)
      arrange?.(save)
    },
  })
  return { h, a: h.join(tokens[0]), b: h.join(tokens[1]) }
}

test('every resident walks a clear route, works through the day and is home at night', () => {
  for (const resident of starterResidents) {
    for (const gateRepair of [sagging, settled]) {
      for (let quarter = 0; quarter < 96; quarter++) {
        const spot = residentAt(resident.schedule, { islandTime: at(quarter / 4, 2), gateRepair })
        if (!spot.indoors) assert.ok(canWalkAt(spot, 0.25, waterLevel - maxWadeDepth), `${resident.id} at ${quarter / 4}h`)
      }
    }
    const { home, work } = resident.schedule
    const world = (hour, day = 0) => ({ islandTime: at(hour, day), gateRepair: sagging })
    assert.equal(residentAt(resident.schedule, world(12)).stop, 'work', `${resident.id} works at noon`)
    assert.ok(distance(residentAt(resident.schedule, world(12)), work) < 0.01)
    assert.equal(residentAt(resident.schedule, world(23)).stop, 'home')
    const night = residentAt(resident.schedule, world(3))
    assert.ok(night.indoors)
    assert.equal(night.windowLit, false)
    assert.ok(distance(night, home) < 2)
    // Sleeping through the night lands everyone on the 06:00 point of their schedule, the same on every client.
    assert.deepEqual(residentAt(resident.schedule, { islandTime: daySeconds * 3, gateRepair: sagging }), residentAt(resident.schedule, world(6, 3)))
  }
  assert.equal(new Set(starterResidents.map(({ id }) => id)).size, starterResidents.length)
})

test('each household has predictable porch, entry, bedtime, waking and departure boundaries', () => {
  const bedtimes = new Set()
  for (const { id, schedule } of starterResidents) {
    const { household: { goesIn, bedtime, wakes, stepsOut = schedule.departs } } = schedule
    const spot = (hour) => residentAt(schedule, { islandTime: at(hour, 2), gateRepair: sagging })
    bedtimes.add(bedtime)
    assert.deepEqual([spot(goesIn - 0.01).stop, spot(goesIn - 0.01).indoors], ['home', false], id)
    assert.equal(spot(goesIn + 0.001).walking, true, id)
    assert.deepEqual([spot(goesIn + 0.1).indoors, spot(goesIn + 0.1).windowLit], [true, true], id)
    assert.equal(spot(bedtime - 0.01).windowLit, true, id)
    assert.equal(spot(bedtime + 0.01).windowLit, false, id)
    assert.equal(spot(wakes - 0.01).windowLit, false, id)
    assert.deepEqual([spot(wakes + 0.01).indoors, spot(wakes + 0.01).windowLit], [true, true], id)
    assert.deepEqual([spot(stepsOut + 0.001).indoors, spot(stepsOut + 0.001).windowLit], [false, false], id)
  }
  assert.ok(bedtimes.size > 1)
})

test('Mara takes a porch hand-in, then a late crewmate cannot talk to her through the wall after a restart', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-household-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const recorded = []
  const run = createPlaytestMetrics((event) => recorded.push(event))
  const { h, a, b } = startAfterShift(t, 'mara', { hour: 18.5, goods: [{}, { carrots: 2 }], metrics: run() })
  choose(a, 'accept-favor', 'mara')
  h.advance()
  const save = h.game.snapshotForSave()
  save.islandTime = at(19.1)
  file.write(save)
  choose(b, 'hand-over', 'mara')
  h.advance()
  assert.equal(a.state.residents.mara.trust, 1)
  const resumed = setup(t, { saved: file.load(), metrics: run() })
  const late = resumed.join(tokens[1])
  const spot = residentAt(byId('mara').schedule, late.state)
  assert.deepEqual([spot.indoors, spot.windowLit], [true, true])
  assert.ok(distance(spot, late.player) < 2.4, 'near enough to talk if Mara were outside')
  choose(late, 'talk', 'mara')
  late.request('interact', { choice: { action: 'hand-over', subject: subject('mara'), favor: 'mara-supper' } })
  resumed.advance()
  assert.equal(count(late, 'resident-chat'), 0)
  assert.ok(!atResident(byId('mara'), late.state, late.player))
  assert.equal(late.player.goods.carrots, 2)
  assert.equal(late.state.residents.mara.trust, 0)
  const notHome = /Mara is inside.*small fishing dock from 06:00/
  assert.match(favorGuides(starterResidents, late.state, late.player).find(({ title }) => title === 'Carrots for Mara’s supper').next, notHome)
  const payments = recorded.filter(({ event, resident }) => event === 'favor-paid' && resident === 'mara')
  assert.deepEqual(payments.map(({ run, favor, residentStop, slot, trustChange }) => [run, favor, residentStop, slot, trustChange]), [
    [1, 'mara-supper', 'home', 1, 1],
  ])
})

test('both crewmates turn in and see households resume from the same dawn', (t) => {
  const h = setup(t, {
    players: [player(0, door(0)), player(1, door(1))],
    arrange: (save) => { save.islandTime = at(23) },
  })
  const crew = tokens.slice(0, 2).map((token) => h.join(token))
  for (const member of crew) member.request('interact', { choice: { action: 'sleep' } })
  h.advance()
  for (const member of crew) {
    assert.equal(member.state.weather.hour, 6)
    const atDawn = (id) => residentAt(byId(id).schedule, member.state)
    assert.equal(atDawn('mara').walking, true)
    assert.equal(atDawn('wren').windowLit, false)
    assert.equal(atDawn('bram').windowLit, true)
  }
})

test('a resident asks, either crewmate agrees in the conversation, and the partner keeps the favor once', (t) => {
  for (const [id, goods] of [['mara', 'carrots'], ['ines', 'fish']]) {
    const resident = byId(id)
    const { h, a, b } = startAfterShift(t, id, { goods: [{}, { [goods]: 3 }] })
    assert.deepEqual(actionHint(a.state, a.player), ['E', `Talk to ${resident.identity.name}`])
    choose(a, 'talk', id)
    h.advance()
    assert.deepEqual(a.messages.at(-1), { type: 'resident-chat', resident: id })
    assert.match(favorLine(resident, a.state), new RegExp(goods === 'fish' ? 'two from the harbor' : 'couple of carrots'))
    assert.equal(a.state.residents[id].trust, 0, 'talking earns nothing')

    // Both press Agree on the same tick: the favor opens once for the crew.
    choose(a, 'accept-favor', id)
    choose(b, 'accept-favor', id)
    h.advance()
    assert.deepEqual(a.state.residents[id], { ...blankRecord(), trust: 0, kept: [], active: resident.favors[0].id })
    assert.equal(count(a, 'favor-accepted'), 1)
    assert.equal(count(b, 'favor-accepted'), 1)
    assert.match(favorFeedback(b.messages.find(({ type }) => type === 'favor-accepted'), 1).label, /^Your crewmate agreed to help/)
    assert.ok(favorGuides(starterResidents, b.state, b.player).some(({ title }) => title === resident.favors[0].title))

    // Without the goods there is nothing to hand over, and a hand-in to the wrong resident does nothing.
    assert.ok(!interactions(a.state, a.player).some(({ action }) => action === 'hand-over'))
    choose(a, 'hand-over', id)
    h.advance()
    assert.equal(a.state.residents[id].active, resident.favors[0].id)
    assert.deepEqual(actionHint(b.state, b.player), ['E', `Give 2 ${goods} to ${resident.identity.name}`])
    choose(b, 'hand-over', id === 'mara' ? 'ines' : 'mara')
    h.advance()
    assert.equal(b.state.residents[id].trust, 0)

    const coins = b.state.crewCoins
    choose(b, 'hand-over', id)
    choose(b, 'hand-over', id)
    h.advance()
    assert.equal(b.player.goods[goods], 1, 'two handed over, once')
    assert.equal(b.state.crewCoins, coins + 5)
    assert.deepEqual(b.state.residents[id], { ...blankRecord(), trust: 1, kept: [resident.favors[0].id], active: null })
    for (const client of [a, b]) {
      assert.deepEqual(client.messages.filter(({ type }) => type === 'favor-pay'), [{ type: 'favor-pay', resident: id, favor: resident.favors[0].id, coins: 5, trust: 1, restored: false }])
    }
    assert.match(favorFeedback(a.messages.find(({ type }) => type === 'favor-pay'), 0).label, new RegExp(`${resident.identity.name} trust \\+1`))
    assert.equal(openOffer(resident, b.state), undefined, 'a kept favor is not asked again')
    choose(a, 'talk', id)
    h.advance()
    assert.equal(a.state.residents[id].trust, 1, 'a repeated greeting adds nothing')
    assert.notEqual(conversationLines(resident, a.state)[0], resident.conversation.lines({ state: a.state, tier: 'stranger', standing: 'steady', kept: [], forgiven: 0 })[0])
  }
})

test('walking away declines without penalty, and a resident out of reach cannot be agreed with', (t) => {
  // The crew waits at the market stall after Ines has gone home for the night.
  const { h, a } = startAfterShift(t, 'ines', { hour: 22 })
  assert.equal(atResident(byId('ines'), a.state, a.player), false, 'Ines has gone home')
  choose(a, 'accept-favor', 'ines')
  h.advance()
  assert.deepEqual(a.state.residents.ines, { ...blankRecord(), trust: 0, kept: [], active: null })
  assert.ok(openOffer(byId('ines'), a.state), 'the offer waits for the next visit')
})

const allCratesDelivered = (save) => {
  for (const item of save.world.items) if (item.kind === 'crate') item.delivered = true
}

test('Bram’s staged crate completes his favor, and during a delivery order the bay takes nothing', (t) => {
  const bram = byId('bram')
  const { h, a } = startAfterShift(t, 'bram', { arrange: allCratesDelivered })
  assert.equal(openOffer(bram, a.state)?.id, 'bram-staging')
  assert.ok(!interactions(a.state, a.player).some(({ action }) => action === 'pick-up'), 'no crate is cargo before Bram asks')
  choose(a, 'accept-favor', 'bram')
  h.advance()
  const crate = a.state.items[0]
  assert.equal(crate.delivered, false, 'a crate comes back to the yard for the favor')
  assert.ok(distance(crate, crateStarts[0]) < 0.5)

  // A crewmate carrying that crate sets it down in the bay.
  const carrying = (save) => {
    allCratesDelivered(save)
    save.world.residents.bram = { ...blankRecord(), trust: 0, kept: [], active: 'bram-staging' }
    Object.assign(save.world.items[0], { holder: 1, delivered: false })
    Object.assign(save.crew[1].player, { x: stagingBay.x + 0.4, z: stagingBay.z, y: walkingHeight(stagingBay) })
  }
  const staged = startAfterShift(t, 'bram', { arrange: carrying })
  const { b } = staged
  assert.equal(interactions(b.state, b.player)[0].label, 'Stage crate for Bram')
  const coins = b.state.crewCoins
  b.request('interact', { choice: { action: 'put-down' } })
  staged.h.advance()
  assert.equal(b.state.items[0].delivered, true)
  assert.equal(b.state.crewCoins, coins + 5)
  assert.deepEqual(b.state.residents.bram, { ...blankRecord(), trust: 1, kept: ['bram-staging'], active: null })
  assert.equal(count(staged.a, 'favor-pay'), 1)
  staged.h.advance(5)
  assert.ok(b.state.items.filter(({ kind }) => kind === 'crate').every(({ delivered }) => delivered), 'no spare crate after the favor')

  // A crate set down in the bay during a delivery order stays an order crate.
  const order = startAfterShift(t, 'bram', {
    arrange(save) {
      carrying(save)
      save.world.jobs = { active: { id: 'farm-supplies', progress: 0 }, completed: 0 }
    },
  })
  assert.notEqual(interactions(order.b.state, order.b.player)[0].label, 'Stage crate for Bram')
  order.b.request('interact', { choice: { action: 'put-down' } })
  order.h.advance()
  assert.equal(order.b.state.items[0].delivered, false)
  assert.equal(order.b.state.residents.bram.active, 'bram-staging')
})

test('a favor under way and a kept favor survive a host restart and reach a late crewmate', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-residents-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const { h, a } = startAfterShift(t, 'mara', { goods: [{ carrots: 2 }] })
  choose(a, 'accept-favor', 'mara')
  h.advance()
  file.write(h.game.snapshotForSave())
  const resumed = setup(t, { saved: file.load() })
  const late = resumed.join(tokens[1])
  assert.ok(favorGuides(starterResidents, late.state, late.player).some(({ title }) => title === 'Carrots for Mara’s supper'))
  const giver = resumed.join(tokens[0])
  choose(giver, 'hand-over', 'mara')
  resumed.advance()
  file.write(resumed.game.snapshotForSave())
  const after = setup(t, { saved: file.load() })
  const partner = after.join(tokens[1])
  assert.deepEqual(partner.state.residents.mara, { ...blankRecord(), trust: 1, kept: ['mara-supper'], active: null })
  assert.deepEqual(partner.state.lastFavorPay, { resident: 'mara', favor: 'mara-supper', coins: 5 })
  assert.match(conversationLines(byId('mara'), partner.state)[0], /crew that fed me/)
})

test('version 3 saves carry Wren’s trust into the resident records, and malformed records do not load', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-residents-save-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const current = createGame().snapshotForSave()
  const v3 = (gateRepair, trust, receipt) => {
    const world = JSON.parse(JSON.stringify(current.world))
    delete world.residents
    return { ...current, version: 3, world: { ...world, gateRepair, residentTrust: { wren: trust }, ...receipt && { lastFavorPay: receipt } } }
  }
  file.write(v3({ stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: 0 }, 1, { resident: 'wren', coins: 5 }))
  const mended = file.load()
  assert.equal(mended.version, 6)
  assert.deepEqual(mended.world.residents, { ...initialResidents(starterResidents), wren: { ...blankRecord(), trust: 1, kept: ['wren-gate'], active: null } })
  assert.deepEqual(mended.world.lastFavorPay, { resident: 'wren', favor: 'wren-gate', coins: 5 })
  file.write(v3({ stage: 'inspected', pinHolder: null, acceptedAt: 0 }, 0))
  assert.equal(file.load().world.residents.wren.active, 'wren-gate')

  // A resident added after the save starts as a stranger.
  const older = { ...current.world.residents }
  delete older.ines
  file.write({ ...current, world: { ...current.world, residents: older } })
  assert.deepEqual(createGame({ save: file.load() }).tick().residents.ines, { ...blankRecord(), trust: 0, kept: [], active: null })

  for (const residents of [{ stranger: { ...blankRecord(), trust: 0, kept: [], active: null } }, { mara: { ...blankRecord(), trust: 1, kept: ['ines-display'], active: null } }, { mara: { ...blankRecord(), trust: 2, kept: ['mara-supper', 'mara-supper'], active: null } }, { mara: { ...blankRecord(), trust: 1, kept: ['mara-supper'], active: 'mara-supper' } }, { mara: { ...blankRecord(), trust: 0.5, kept: [], active: null } }]) {
    file.write({ ...current, world: { ...current.world, residents: { ...current.world.residents, ...residents } } })
    assert.throws(() => file.load(), /Could not load island save/)
  }
  file.write({ ...current, world: { ...current.world, lastFavorPay: { resident: 'mara', favor: 'wren-gate', coins: 5 } } })
  assert.throws(() => file.load(), /Could not load island save/)
})

test('trust tiers rise with kept favors, a favor credits once, and dawns count across midnight', () => {
  assert.deepEqual([0, 1, 2, 3, 9].map(trustTier), ['stranger', 'familiar', 'familiar', 'trusted', 'trusted'])
  const state = { residents: initialResidents(starterResidents), crewCoins: 0 }
  const mara = byId('mara')
  assert.deepEqual(keepFavor(state, mara, mara.favors[0]), { resident: 'mara', favor: 'mara-supper', coins: 5, trust: 1, restored: false })
  assert.equal(keepFavor(state, mara, mara.favors[0]), null)
  assert.equal(state.crewCoins, 5)
  assert.equal(state.residents.mara.trust, 1)
  assert.equal(dawnsBetween(daySeconds - 1, daySeconds), 1)
  assert.equal(dawnsBetween(1, daySeconds - 1), 0)
})
