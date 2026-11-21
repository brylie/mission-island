import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { actionHint } from '../src/actions.ts'
import { interactions } from '../src/interaction-options.ts'
import { favorFeedback } from '../src/resident-notices.ts'
import { conversationLines, favorGuides, openOffer } from '../src/residents/favors.ts'
import { atResident, residentAt } from '../src/residents/schedule.ts'
import { initialResidents, keepFavor, trustTier } from '../src/residents/trust.ts'
import { canWalkAt } from '../src/simulation/movement.ts'
import { maxWadeDepth, walkingHeight, waterLevel } from '../src/terrain.ts'
import { dawnsBetween, daySeconds } from '../src/weather.ts'
import { crateStarts, distance } from '../src/world.ts'
import { starterResidents } from '../src/worlds/starter/residents.ts'
import { stagingBay } from '../src/worlds/starter/residents/bram.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const at = (hour, day = 0) => day * daySeconds + ((hour - 6 + 24) % 24) * daySeconds / 24
const subject = (id) => starterResidents.findIndex((resident) => resident.id === id)
const byId = (id) => starterResidents[subject(id)]
const sagging = { stage: 'sagging', pinHolder: null }
const settled = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: 0 }
const choose = (client, action, id) => client.request('interact', { choice: { action, subject: subject(id) } })
const count = (client, type) => client.messages.filter((message) => message.type === type).length

// Two crewmates standing a step from a resident at work, mid-morning after the starter shift.
function beside(id, hour = 10) {
  const spot = residentAt(byId(id).schedule, { islandTime: at(hour), gateRepair: sagging })
  return [-.9, .9].map((side, index) => player(index, { x: spot.x + side, z: spot.z + .6 }, { y: walkingHeight(spot) }))
}

function startAfterShift(t, id, { hour = 10, arrange, goods = [] } = {}) {
  const players = beside(id).map((entry, index) => ({ ...entry, goods: { fish: 0, carrots: 0, ...goods[index] } }))
  const h = setup(t, {
    players,
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
        if (!spot.indoors) assert.ok(canWalkAt(spot, .25, waterLevel - maxWadeDepth), `${resident.id} at ${quarter / 4}h`)
      }
    }
    const { home, work } = resident.schedule
    const world = (hour, day = 0) => ({ islandTime: at(hour, day), gateRepair: sagging })
    assert.equal(residentAt(resident.schedule, world(12)).stop, 'work', `${resident.id} works at noon`)
    assert.ok(distance(residentAt(resident.schedule, world(12)), work) < .01)
    assert.equal(residentAt(resident.schedule, world(23)).stop, 'home')
    assert.ok(distance(residentAt(resident.schedule, world(3)), home) < .01)
    // Sleeping through the night lands everyone on the 06:00 point of their schedule, the same on every client.
    assert.deepEqual(residentAt(resident.schedule, { islandTime: daySeconds * 3, gateRepair: sagging }),
      residentAt(resident.schedule, world(6, 3)))
  }
  assert.equal(new Set(starterResidents.map(({ id }) => id)).size, starterResidents.length)
})

test('a resident asks, either crewmate agrees in the conversation, and the partner keeps the favor once', (t) => {
  for (const [id, goods] of [['mara', 'carrots'], ['ines', 'fish']]) {
    const resident = byId(id)
    const { h, a, b } = startAfterShift(t, id, { goods: [{}, { [goods]: 3 }] })
    assert.deepEqual(actionHint(a.state, a.player), ['E', `Talk to ${resident.identity.name}`])
    choose(a, 'talk', id)
    h.advance()
    assert.deepEqual(a.messages.at(-1), { type: 'resident-chat', resident: id })
    assert.match(conversationLines(resident, a.state)[1], new RegExp(goods === 'fish' ? 'two from the harbor' : 'couple of carrots'))
    assert.equal(a.state.residents[id].trust, 0, 'talking earns nothing')

    // Both press Agree on the same tick: the favor opens once for the crew.
    choose(a, 'accept-favor', id)
    choose(b, 'accept-favor', id)
    h.advance()
    assert.deepEqual(a.state.residents[id], { trust: 0, kept: [], active: resident.favors[0].id })
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
    assert.deepEqual(b.state.residents[id], { trust: 1, kept: [resident.favors[0].id], active: null })
    for (const client of [a, b]) {
      assert.deepEqual(client.messages.filter(({ type }) => type === 'favor-pay'),
        [{ type: 'favor-pay', resident: id, favor: resident.favors[0].id, coins: 5, trust: 1 }])
    }
    assert.match(favorFeedback(a.messages.find(({ type }) => type === 'favor-pay'), 0).label, new RegExp(`${resident.identity.name} trust \\+1`))
    assert.equal(openOffer(resident, b.state), undefined, 'a kept favor is not asked again')
    choose(a, 'talk', id)
    h.advance()
    assert.equal(a.state.residents[id].trust, 1, 'a repeated greeting adds nothing')
    assert.notEqual(conversationLines(resident, a.state)[0], resident.conversation.lines({ state: a.state, tier: 'stranger', kept: [] })[0])
  }
})

test('walking away declines without penalty, and a resident out of reach cannot be agreed with', (t) => {
  // The crew waits at the market stall after Ines has gone home for the night.
  const { h, a } = startAfterShift(t, 'ines', { hour: 22 })
  assert.equal(atResident(byId('ines'), a.state, a.player), false, 'Ines has gone home')
  choose(a, 'accept-favor', 'ines')
  h.advance()
  assert.deepEqual(a.state.residents.ines, { trust: 0, kept: [], active: null })
  assert.ok(openOffer(byId('ines'), a.state), 'the offer waits for the next visit')
})

const allCratesDelivered = (save) => { for (const item of save.world.items) if (item.kind === 'crate') item.delivered = true }

test('Bram’s staged crate completes his favor, and during a delivery order the bay takes nothing', (t) => {
  const bram = byId('bram')
  const { h, a } = startAfterShift(t, 'bram', { arrange: allCratesDelivered })
  assert.equal(openOffer(bram, a.state)?.id, 'bram-staging')
  assert.ok(!interactions(a.state, a.player).some(({ action }) => action === 'pick-up'), 'no crate is cargo before Bram asks')
  choose(a, 'accept-favor', 'bram')
  h.advance()
  const crate = a.state.items[0]
  assert.equal(crate.delivered, false, 'a crate comes back to the yard for the favor')
  assert.ok(distance(crate, crateStarts[0]) < .5)

  // A crewmate carrying that crate sets it down in the bay.
  const carrying = (save) => {
    allCratesDelivered(save)
    save.world.residents.bram = { trust: 0, kept: [], active: 'bram-staging' }
    Object.assign(save.world.items[0], { holder: 1, delivered: false })
    Object.assign(save.crew[1].player, { x: stagingBay.x + .4, z: stagingBay.z, y: walkingHeight(stagingBay) })
  }
  const staged = startAfterShift(t, 'bram', { arrange: carrying })
  const { b } = staged
  assert.equal(interactions(b.state, b.player)[0].label, 'Stage crate for Bram')
  const coins = b.state.crewCoins
  b.request('interact', { choice: { action: 'put-down' } })
  staged.h.advance()
  assert.equal(b.state.items[0].delivered, true)
  assert.equal(b.state.crewCoins, coins + 5)
  assert.deepEqual(b.state.residents.bram, { trust: 1, kept: ['bram-staging'], active: null })
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
  assert.deepEqual(partner.state.residents.mara, { trust: 1, kept: ['mara-supper'], active: null })
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
  assert.equal(mended.version, 4)
  assert.deepEqual(mended.world.residents, { ...initialResidents(starterResidents), wren: { trust: 1, kept: ['wren-gate'], active: null } })
  assert.deepEqual(mended.world.lastFavorPay, { resident: 'wren', favor: 'wren-gate', coins: 5 })
  file.write(v3({ stage: 'inspected', pinHolder: null, acceptedAt: 0 }, 0))
  assert.equal(file.load().world.residents.wren.active, 'wren-gate')

  // A resident added after the save starts as a stranger.
  const older = { ...current.world.residents }
  delete older.ines
  file.write({ ...current, world: { ...current.world, residents: older } })
  assert.deepEqual(createGame({ save: file.load() }).tick().residents.ines, { trust: 0, kept: [], active: null })

  for (const residents of [{ stranger: { trust: 0, kept: [], active: null } }, { mara: { trust: 1, kept: ['ines-display'], active: null } },
    { mara: { trust: 2, kept: ['mara-supper', 'mara-supper'], active: null } }, { mara: { trust: 1, kept: ['mara-supper'], active: 'mara-supper' } },
    { mara: { trust: .5, kept: [], active: null } }]) {
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
  assert.deepEqual(keepFavor(state, mara, mara.favors[0]), { resident: 'mara', favor: 'mara-supper', coins: 5 })
  assert.equal(keepFavor(state, mara, mara.favors[0]), null)
  assert.equal(state.crewCoins, 5)
  assert.equal(state.residents.mara.trust, 1)
  assert.equal(dawnsBetween(daySeconds - 1, daySeconds), 1)
  assert.equal(dawnsBetween(1, daySeconds - 1), 0)
})
