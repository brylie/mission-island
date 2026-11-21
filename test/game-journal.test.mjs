import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { interactions } from '../src/interaction-options.ts'
import { emptyJournal, journalTally } from '../src/journal/journal.ts'
import { northernRegions } from '../src/scenery.ts'
import { mirrorPoolWillow } from '../src/worlds/starter/sites.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const willow = 64, gull = 48
const bank = { x: mirrorPoolWillow.x + 4, z: mirrorPoolWillow.z }
const pile = { x: -44, z: -34 }
const journalWith = notes => ({ ...emptyJournal(), entries: Object.fromEntries(Object.entries(notes).map(([id, first]) => [id, { first }])) })
const record = (client, subject) => client.request('interact', { choice: { action: 'record', subject } })

function saveFile(t) {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-journal-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return islandSaveFile(root, 5173)
}

test('landing a fish names it for the angler and notes it once for the crew', (t) => {
  const dock = { x: -44, z: -36.7 }
  const h = setup(t, { players: [player(0, dock, { inventory: ['fishing-rod'], equipped: 'fishing-rod' }), player(1)] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  function land() {
    h.input(a)
    a.request('primary', { phase: 'start' })
    h.hold(a, 26)
    a.request('primary', { phase: 'release', aim: Math.PI })
    h.advance()
    h.hold(a, 110)
    let reeling = false
    for (let i = 0; i < 690 && a.player.casting; i++) {
      h.input(a)
      const desired = !a.player.casting.fight.pulling
      if (desired !== reeling) a.request('primary', { phase: desired ? 'start' : 'release' })
      reeling = desired
      h.advance()
    }
  }
  land()
  assert.deepEqual(a.messages.filter(({ type }) => type === 'fishing-result').at(-1), { type: 'fishing-result', result: 'caught', fish: 'fish:shore-perch' })
  const note = b.state.journal.entries['fish:shore-perch']?.first
  assert.equal(note.by, 0)
  assert.equal(note.at, 'dock')
  const saves = h.checkpoint.mock.callCount()
  land()
  assert.equal(a.player.goods.fish, 2)
  assert.deepEqual(b.state.journal.entries['fish:shore-perch']?.first, note)
  assert.equal(Object.keys(b.state.journal.entries).length, 1)
  // The second fish is saved as goods, with no second journal save.
  assert.equal(h.checkpoint.mock.callCount(), saves + 1)
})

test('walking into a place notes it and its country for the crew, while each map stays personal', (t) => {
  const region = northernRegions[0]
  const h = setup(t, { players: [player(0, region.site), player(1)] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  h.input(a)
  h.advance()
  assert.deepEqual(b.state.journal, journalWith({ 'place:juniper': { t: 0, by: 0, at: 'juniper' }, 'biome:juniper': { t: 0, by: 0, at: 'juniper' } }))
  assert.deepEqual(a.player.discoveries, ['juniper'])
  assert.deepEqual(b.player.discoveries, [])

  // The partner's own visit reveals their map and leaves the crew's first note alone.
  const later = setup(t, { saved: h.game.snapshotForSave(), arrange: (save) => Object.assign(save.crew[1].player, region.site) })
  const partner = later.join(tokens[1])
  later.input(partner)
  later.advance()
  assert.deepEqual(partner.player.discoveries, ['juniper'])
  assert.equal(partner.state.journal.entries['place:juniper']?.first.by, 0)
  assert.equal(Object.keys(partner.state.journal.entries).length, 2)
})

test('recording by reticle needs the subject in reach, and two records on one tick make one entry', (t) => {
  const h = setup(t, { players: [player(0, bank), player(1, bank)], arrange: (save) => { save.world.journal = journalWith({ 'biome:pool': { t: 0, by: 0 }, 'place:pool': { t: 0, by: 0 } }) } })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.ok(interactions(a.state, a.player).some(({ action, subject }) => action === 'record' && subject === willow))
  // A bare E never records, and neither does a subject that is out of reach or does not exist.
  a.request('interact')
  record(a, gull)
  record(a, 16 * 90)
  h.advance()
  assert.equal(a.state.journal.entries['sight:willow']?.first, undefined)
  assert.equal(a.state.journal.entries['sight:gull']?.first, undefined)

  record(b, willow)
  record(a, willow)
  h.advance()
  assert.deepEqual(a.state.journal.entries['sight:willow']?.first, { t: 0, by: 1, at: 'pool' })
  assert.ok(!interactions(a.state, a.player).some(({ action }) => action === 'record'))
  record(a, willow)
  h.advance()
  assert.equal(a.state.journal.entries['sight:willow']?.first.by, 1)
})

test('a resting gull is noted with what it was doing, and a later watcher adds only the behavior', (t) => {
  const h = setup(t, { players: [player(0, pile)] })
  const a = h.join(tokens[0])
  record(a, gull)
  h.advance()
  assert.deepEqual(Object.keys(a.state.journal.entries), ['sight:gull', 'sight:gull/resting'])
  assert.equal(a.state.journal.entries['sight:gull/resting']?.first.at, 'dock')

  const seen = setup(t, { players: [player(0, pile)], arrange: (save) => { save.world.journal = journalWith({ 'sight:gull': { t: 0, by: 1 } }) } })
  const c = seen.join(tokens[0])
  assert.ok(interactions(c.state, c.player).some(({ label }) => label === 'Add this behavior to the journal'))
  record(c, gull)
  seen.advance()
  assert.deepEqual(c.state.journal.entries['sight:gull']?.first, { t: 0, by: 1 })
  assert.equal(c.state.journal.entries['sight:gull/resting']?.first.by, 0)
})

test('the journal survives a host restart and reaches a late crewmate', (t) => {
  const file = saveFile(t)
  const h = setup(t, { players: [player(0, bank), player(1)] })
  const a = h.join(tokens[0])
  record(a, willow)
  h.advance()
  file.write(h.game.snapshotForSave())
  const resumed = setup(t, { saved: file.load() })
  const late = resumed.join(tokens[1])
  assert.deepEqual(late.state.journal, a.state.journal)
  assert.ok(late.state.journal.entries['sight:willow']?.first)
  assert.equal(journalTally(late.state.journal).recorded, Object.keys(a.state.journal.entries).length)
})

test('an older save starts its journal from the places its crew found, and a malformed journal does not load', (t) => {
  const file = saveFile(t)
  const current = createGame().snapshotForSave()
  const older = JSON.parse(JSON.stringify(current))
  delete older.world.journal
  older.islandTime = 500.6
  older.crew = [
    { token: tokens[0], reserved: true, player: player(0, undefined, { discoveries: ['juniper', 'shellglass'] }) },
    { token: tokens[1], reserved: true, player: player(1, undefined, { discoveries: ['juniper', 'a-place-since-removed'] }) },
    { token: tokens[2], reserved: false, player: player(0) },
  ]
  file.write(older)
  assert.deepEqual(createGame({ save: file.load() }).tick().journal,
    { ...emptyJournal(), entries: { 'place:juniper': {}, 'place:shellglass': {} } })

  const withJournal = (journal) => ({ ...current, islandTime: 100, world: { ...current.world, journal } })
  file.write(withJournal({ 'fish:sand-dab': { t: 100, by: 1, at: 'driftwood' }, 'sight:hare/grazing': { t: 0, by: 0 } }))
  assert.equal(Object.keys(file.load().world.journal.entries).length, 2)
  for (const journal of [{ 'fish:kraken': { t: 1, by: 0 } }, { 'fish:sand-dab': { t: 101, by: 0 } }, { 'fish:sand-dab': { t: 1.5, by: 0 } },
    { 'fish:sand-dab': { t: -1, by: 0 } }, { 'fish:sand-dab': { t: 1, by: 2 } }, { 'fish:sand-dab': { t: 1, by: .5 } },
    { 'fish:sand-dab': { t: 1, by: 0, at: 'atlantis' } }, { 'fish:sand-dab': { t: 1, by: 0, at: 4 } }, { 'fish:sand-dab': 'caught' }, ['fish:sand-dab']]) {
    file.write(withJournal(journal))
    assert.throws(() => file.load(), /Could not load island save/)
  }
})

test('both PR save formats load and rewrite as the same journal version', (t) => {
  const file = saveFile(t)
  const base = createGame().snapshotForSave()
  const { ferryRepair, ...legacyWorld } = base.world
  const legacy = [
    {
      stored: {
        'fish:sand-dab': { t: 4, by: 1, at: 'driftwood' },
        'place:shellglass': { t: 12, by: 0, at: 'shellglass' },
        'sight:hare/sheltering': { t: 20, by: 1, at: 'juniper' },
      },
      expected: journalWith({
        'fish:sand-dab': { t: 4, by: 1, at: 'driftwood' },
        'place:shellglass': { t: 12, by: 0, at: 'shellglass' },
        'sight:hare/sheltering': { t: 20, by: 1, at: 'juniper' },
      }),
    },
    {
      stored: { heardMara: true, records: [
        { id: 'place:juniper' },
        { id: 'place:shellglass', seen: { time: 63.45, rain: 0 } },
        { id: 'clover', seen: { time: 66.25, rain: 0 } },
        { id: 'hare-sheltering', seen: { time: 94.25, rain: .9 } },
      ] },
      expected: { ...emptyJournal(), heardMara: true, entries: {
        'place:juniper': {},
        'place:shellglass': { outing: { t: 63.45, at: 'shellglass', rain: 0 } },
        'sight:clover': { outing: { t: 66.25, at: 'juniper', rain: 0 } },
        'sight:hare/sheltering': { outing: { t: 94.25, at: 'juniper', rain: .9 } },
      } },
    },
  ]
  for (const { stored, expected } of legacy) {
    file.write({ ...base, version: 4, islandTime: 100, world: { ...legacyWorld, journal: stored } })
    const migrated = file.load()
    assert.equal(migrated.version, 6)
    assert.deepEqual(migrated.world.ferryRepair, ferryRepair)
    assert.deepEqual(migrated.world.journal, expected)
    file.write(createGame({ save: migrated }).snapshotForSave())
    assert.deepEqual(file.load().world.journal, expected)
  }
})

test('the journal rejects duplicate old records and malformed current observations', (t) => {
  const file = saveFile(t)
  const save = createGame().snapshotForSave()
  for (const journal of [
    { heardMara: true, records: [{ id: 'place:juniper' }, { id: 'place:juniper' }] },
    { heardMara: true, records: [{ id: 'foxglove' }] },
    { version: 2, heardMara: false, entries: {} },
    { ...emptyJournal(), entries: { 'fish:sand-dab': { outing: { t: 0 } } } },
    { ...emptyJournal(), entries: { 'sight:clover': { outing: { t: 0, rain: 1.5 } } } },
  ]) {
    file.write({ ...save, world: { ...save.world, journal } })
    assert.throws(() => file.load(), /Could not load island save/)
  }
})
