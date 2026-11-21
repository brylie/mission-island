import assert from 'node:assert/strict'
import test from 'node:test'
import { actionHint, interactRequest } from '../src/actions.ts'
import { juniperCenter } from '../src/juniper-habitat.ts'
import { journalCatalog, journalEntry, journalSubjects } from '../src/journal/catalog.ts'
import { fishAt, fishKinds } from '../src/journal/fish.ts'
import { emptyJournal, journalTally, noteConditions, placeName, placeNear, recordEntry } from '../src/journal/journal.ts'
import { journalInteractions, sightingEntries, sightingRange } from '../src/journal/sightings.ts'
import { daySeconds, weatherAt } from '../src/weather.ts'
import { beach, harbor } from '../src/world.ts'
import { mirrorPoolWillow } from '../src/worlds/starter/sites.ts'
import { createGame } from '../server/game.ts'
import { player } from './support/game-harness.mjs'

const day = 0, shower = 122, night = 300

// A quiet island with one hare, one fox and a calm school, so a test can place the watcher beside any of them.
function island(overrides = {}) {
  const state = JSON.parse(JSON.stringify(createGame().tick()))
  return {
    ...state, islandTime: day, weather: weatherAt(day), journal: emptyJournal(),
    juniper: { hares: [{ x: 0, z: 0, heading: 0, behavior: 'fleeing' }], foxes: [{ x: 4, z: 0, heading: 0, behavior: 'chasing' }], clover: [] },
    driftwood: { leader: -1, fish: [{ x: 30, z: -52, heading: 0, startled: false }, { x: 32, z: -52, heading: 0, startled: false }] },
    ...overrides,
  }
}

test('the first record of an entry stands and the tally counts each page', () => {
  const journal = emptyJournal()
  assert.equal(recordEntry(journal, 'fish:sand-dab', { t: 4, by: 0 }), true)
  assert.equal(recordEntry(journal, 'fish:sand-dab', { t: 9, by: 1 }), false)
  assert.deepEqual(journal.entries, { 'fish:sand-dab': { first: { t: 4, by: 0 } } })
  recordEntry(journal, 'place:juniper', { t: 5, by: 1 })
  const tally = journalTally(journal)
  assert.equal(tally.total, journalCatalog.length)
  assert.equal(tally.recorded, 2)
  assert.deepEqual(tally.pages.fish, { recorded: 1, total: fishKinds.length })
  assert.equal(tally.pages.fish.total + tally.pages.places.total + tally.pages.nature.total, tally.total)
})

test('journal ids are unique and keep their saved spelling', () => {
  const ids = journalCatalog.map(({ id }) => id)
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(ids, [
    'fish:lantern-eel', 'fish:rain-smelt', 'fish:channel-mackerel', 'fish:sand-dab', 'fish:shore-perch',
    'place:juniper', 'place:fernfall', 'place:pool', 'place:ridge', 'place:shellglass', 'place:splitstone',
    'biome:juniper', 'biome:fernfall', 'biome:pool', 'biome:ridge',
    'sight:school', 'sight:school/regrouping', 'sight:hare', 'sight:hare/grazing', 'sight:hare/fleeing', 'sight:hare/sheltering',
    'sight:fox', 'sight:fox/patrolling', 'sight:fox/watching', 'sight:gull', 'sight:gull/resting', 'sight:gull/gliding',
    'sight:willow', 'sight:clover', 'sight:lookout', 'sight:ferry',
    'biome:driftwood-edge', 'sight:foxglove', 'sight:limpet',
  ])
  // Interactions name a subject by its place in this list, so the order is part of the wire contract.
  assert.deepEqual(journalSubjects.map(({ id }) => id),
    ['sight:school', 'sight:hare', 'sight:fox', 'sight:gull', 'sight:willow', 'sight:clover', 'sight:lookout', 'sight:ferry'])
  assert.equal(journalEntry('sight:hare/grazing').parent, 'sight:hare')
  assert.equal(journalEntry('sight:unicorn'), undefined)
})

test('the fish that bites follows the hour, the weather and the water', () => {
  const dock = { x: -44, z: -45 }
  assert.equal(fishAt(dock, day, false), 'fish:shore-perch')
  assert.equal(fishAt(beach, day, false), 'fish:sand-dab')
  assert.equal(fishAt(dock, day, true), 'fish:channel-mackerel')
  assert.equal(fishAt(beach, shower, true), 'fish:rain-smelt')
  assert.equal(fishAt(beach, night, true), 'fish:lantern-eel')
  // The same cast on a later day lands the same fish.
  assert.equal(fishAt(dock, day + 3 * daySeconds, false), 'fish:shore-perch')
})

test('a note names the nearest place and the conditions it was written in', () => {
  assert.equal(placeName(placeNear(harbor)), 'Harbor Depot')
  assert.equal(placeName(placeNear({ x: -44, z: -36 })), 'Harbor dock')
  assert.equal(placeName(placeNear(mirrorPoolWillow)), 'Mirror Pool')
  assert.equal(placeNear({ x: 400, z: 400 }), undefined)
  assert.equal(placeName(undefined), undefined)
  assert.equal(noteConditions({ t: day, by: 0 }), 'Day 1 · morning')
  assert.equal(noteConditions({ t: shower, by: 0 }), 'Day 1 · midday · rain')
  assert.equal(noteConditions({ t: 200, by: 0 }), 'Day 1 · afternoon')
  assert.equal(noteConditions({ t: night + daySeconds, by: 0 }), 'Day 2 · night')
})

test('the reticle offers each subject in range once, then only a behavior the crew has not seen', () => {
  const hare = { x: juniperCenter.x + 2, z: juniperCenter.z }
  const watcher = player(0, hare)
  const state = island()
  const options = journalInteractions(state, watcher)
  assert.deepEqual(options.map(({ name, label, subject }) => [name, label, subject]), [
    ['Brown hare · fleeing', 'Record in journal', 16], ['Juniper fox', 'Record in journal', 32],
  ])
  assert.deepEqual(sightingEntries(state, watcher, 16).ids, ['sight:hare', 'sight:hare/fleeing'])
  // A fox that is chasing shows nothing the journal lists, so only the fox itself is new.
  assert.deepEqual(sightingEntries(state, watcher, 32).ids, ['sight:fox'])

  recordEntry(state.journal, 'sight:hare', { t: 0, by: 1 })
  recordEntry(state.journal, 'sight:fox', { t: 0, by: 1 })
  assert.deepEqual(journalInteractions(state, watcher).filter(({ subject }) => subject < 48).map(({ label }) => label), ['Add this behavior to the journal'])
  recordEntry(state.journal, 'sight:hare/fleeing', { t: 0, by: 1 })
  assert.deepEqual(journalInteractions(state, watcher).filter(({ subject }) => subject < 48), [])
  assert.deepEqual(sightingEntries(state, watcher, 16).ids, [])

  // Out of range, an unknown subject and a missing animal all record nothing.
  const far = player(0, { x: hare.x + sightingRange + 3, z: hare.z })
  assert.deepEqual(sightingEntries(island(), far, 16), { ids: [], at: undefined })
  assert.deepEqual(sightingEntries(island(), watcher, 17).ids, [])
  assert.deepEqual(sightingEntries(island(), watcher, 16 * 40).ids, [])
})

test('a startled school is noted as regrouping, and an empty one offers nothing', () => {
  const shore = player(0, { x: 31, z: -46 })
  const calm = island()
  assert.deepEqual(sightingEntries(calm, shore, 0).ids, ['sight:school'])
  assert.equal(sightingEntries(calm, shore, 0).at.x, 31)
  const scared = island({ driftwood: { leader: 1, fish: [{ x: 30, z: -52, heading: 0, startled: true }, { x: 32, z: -52, heading: 0, startled: false }] } })
  assert.deepEqual(sightingEntries(scared, shore, 0).ids, ['sight:school', 'sight:school/regrouping'])
  assert.equal(sightingEntries(scared, shore, 0).at.x, 32)
  assert.deepEqual(sightingEntries(island({ driftwood: { leader: -1, fish: [] } }), shore, 0).ids, [])
})

test('a subject within arm’s reach can be recorded without an aim, unless another key has a use there', () => {
  const state = island()
  const beside = player(0, { x: mirrorPoolWillow.x + 2, z: mirrorPoolWillow.z })
  state.players = [beside]
  assert.deepEqual(actionHint(state, beside), ['E', 'Record in journal'])
  assert.deepEqual(interactRequest(state, beside), { type: 'interact', choice: { action: 'record', subject: 64 } })
  // From across the bank it takes the reticle.
  const across = player(0, { x: mirrorPoolWillow.x + 8, z: mirrorPoolWillow.z })
  assert.deepEqual(actionHint(state, across), ['', ''])
  assert.deepEqual(interactRequest(state, across), { type: 'interact' })
  const focus = journalInteractions(state, across)[0]
  assert.deepEqual(actionHint(state, across, focus), ['E', 'Record in journal'])
  // With a rod in hand the cast prompt keeps the prompt line, and E is left alone.
  const angler = { ...beside, equipped: 'fishing-rod' }
  assert.equal(actionHint(state, angler)[1], 'Hold and release to cast')
  assert.deepEqual(interactRequest(state, angler), { type: 'interact' })
})
