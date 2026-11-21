import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { fieldInteractions } from '../src/field-interactions.ts'
import { interactions } from '../src/interaction-options.ts'
import { journalTally } from '../src/journal/journal.ts'
import { outingCount } from '../src/journal/outing.ts'
import { juniperTrail } from '../src/routes.ts'
import { canWalkAt } from '../src/simulation/movement.ts'
import { waterLevel } from '../src/terrain.ts'
import { mara } from '../src/worlds/starter/residents/mara.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const rim = { x: 44.46, z: -30.6 }
const lookout = juniperTrail.points.at(-1)

function choose(client, { action, subject }) {
  client.request('interact', { choice: { action, subject } })
}

function option(client, record) {
  return fieldInteractions(client.state, client.player).find(choice => choice.record === record)
}

test('Mara shares both clues before the carrot favor and recognizes a partner’s earlier observation', (t) => {
  const { work } = mara.schedule
  const dock = { x: work.x, z: work.z + 1.55 }
  const h = setup(t, { players: [player(0, dock), player(1, rim)], arrange: save => { save.islandTime = 30 } })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  h.input(b)
  h.advance()
  assert.ok(b.state.journal.entries['place:shellglass'].first)
  choose(a, interactions(a.state, a.player).find(choice => choice.action === 'talk'))
  h.advance()
  assert.equal(b.state.journal.heardMara, true)
  assert.equal(mara.conversation.fieldNotes(b.state).length, 2)
  assert.equal(b.state.residents.mara.active, null)
  choose(b, option(b, 'place:shellglass'))
  h.advance()
  choose(a, interactions(a.state, a.player).find(choice => choice.action === 'talk'))
  h.advance()
  assert.match(mara.conversation.fieldNotes(a.state)[0], /made a record at Shellglass/)
  assert.match(mara.conversation.fieldNotes(a.state).at(-1), /hard rain/)
  assert.deepEqual(a.state.journal, b.state.journal)
})

test('racing observations credit the crew once and survive reconnect and a disk restart', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-field-journal-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const h = setup(t, { players: [player(0, rim), player(1, rim)], arrange: save => { save.islandTime = 900 } })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  const staff = option(a, 'place:shellglass')
  a.request('interact')
  choose(a, { action: staff.action, subject: 800 })
  h.advance()
  assert.equal(outingCount(a.state.journal), 0)
  assert.ok(a.messages.some(message => message.type === 'field-unavailable'))
  h.input(a)
  h.advance()
  const first = a.state.journal.entries['place:shellglass'].first
  assert.equal(first.by, 0)
  assert.equal(outingCount(a.state.journal), 0)
  assert.equal(journalTally(a.state.journal).recorded, 1)
  h.input(b)
  choose(b, staff)
  choose(a, staff)
  h.advance()
  assert.deepEqual(a.state.journal, b.state.journal)
  assert.equal(journalTally(b.state.journal).recorded, 1)
  assert.equal(outingCount(b.state.journal), 1)
  assert.deepEqual(b.state.journal.entries['place:shellglass'].first, first)
  assert.equal(b.state.journal.entries['place:shellglass'].outing.by, 1)
  assert.deepEqual(b.player.discoveries, ['shellglass'])
  const journal = b.state.journal
  a.close()
  assert.deepEqual(h.join(tokens[0]).state.journal, journal)
  file.write(h.game.snapshotForSave())
  const resumed = setup(t, { saved: file.load() })
  const partner = resumed.join(tokens[1])
  assert.deepEqual(partner.state.journal, journal)
  choose(partner, staff)
  resumed.advance()
  assert.ok(partner.messages.some(message => message.type === 'tide-staff' && message.time > journal.entries['place:shellglass'].outing.t))
  assert.deepEqual(partner.state.journal, journal)
})

test('the Juniper lookout records distinct live hare behavior, with stale and long-range requests refused', (t) => {
  const dry = setup(t, { players: [player(0, lookout), player(1)], arrange: save => { save.islandTime = 30 } })
  const a = dry.join(tokens[0]), b = dry.join(tokens[1])
  const grazing = 'sight:hare/grazing', sheltering = 'sight:hare/sheltering'
  const clover = option(a, 'sight:clover')
  assert.ok(clover)
  assert.ok(!interactions(a.state, a.player).some(({ action, at }) =>
    action === 'record' && at?.x === clover.at.x && at?.z === clover.at.z))
  dry.advanceUntil(() => Boolean(option(a, grazing)), 500)
  const grazed = option(a, grazing)
  choose(b, grazed)
  dry.advance()
  assert.equal(outingCount(b.state.journal), 0)
  dry.advanceUntil(() => !fieldInteractions(a.state, a.player).some(choice => choice.subject === grazed.subject), 500)
  choose(a, grazed)
  dry.advance()
  assert.equal(outingCount(a.state.journal), 0)
  dry.advanceUntil(() => Boolean(option(a, grazing)), 500)
  choose(a, option(a, grazing))
  dry.advance()
  assert.equal(b.state.journal.entries[grazing].outing.rain, 0)
  const save = dry.game.snapshotForSave()
  save.islandTime = 100
  const wet = setup(t, { saved: save })
  const observer = wet.join(tokens[0])
  const partner = wet.join(tokens[1])
  wet.advanceUntil(() => Boolean(option(observer, sheltering)), 500)
  choose(observer, option(observer, sheltering))
  wet.advance()
  assert.equal(outingCount(partner.state.journal), 2)
  assert.ok(partner.state.journal.entries[sheltering].outing.rain >= .65)
})

test('older saves contribute distinct known places and keep each player’s map discoveries', (t) => {
  const save = createGame().snapshotForSave()
  delete save.world.journal
  save.crew = [
    { token: tokens[0], reserved: true, player: player(0, rim, { discoveries: ['shellglass', 'unknown'] }) },
    { token: tokens[1], reserved: true, player: player(1, undefined, { discoveries: ['shellglass', 'juniper'] }) },
  ]
  const h = setup(t, { saved: save })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  assert.deepEqual(a.state.journal.entries, { 'place:shellglass': {}, 'place:juniper': {} })
  assert.deepEqual(b.player.discoveries, ['shellglass', 'juniper'])
  choose(a, option(a, 'place:shellglass'))
  h.advance()
  assert.ok(b.state.journal.entries['place:shellglass'].outing)
  assert.equal(journalTally(b.state.journal).recorded, 2)
})

test('the worn Juniper approach clears scenery from the road to the clover lookout', () => {
  for (let index = 1; index < juniperTrail.points.length; index++) {
    const from = juniperTrail.points[index - 1], to = juniperTrail.points[index]
    const count = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) * 4)
    for (let step = 0; step <= count; step++) {
      const t = step / count
      const point = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t }
      assert.ok(canWalkAt(point, .38, waterLevel), JSON.stringify(point))
    }
  }
})
