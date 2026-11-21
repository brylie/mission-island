import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { fieldInteractions } from '../src/field-interactions.ts'
import { interactions } from '../src/interaction-options.ts'
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
  assert.equal(a.state.journal.records.length, 0)
  assert.ok(a.messages.some(message => message.type === 'field-unavailable'))
  choose(a, staff)
  choose(b, staff)
  h.advance()
  assert.deepEqual(a.state.journal, b.state.journal)
  assert.deepEqual(b.state.journal.records.map(record => record.id), ['place:shellglass'])
  for (const client of [a, b]) {
    assert.equal(client.messages.filter(message => message.type === 'field-record' && message.credited).length, 1)
  }
  const journal = b.state.journal
  a.close()
  assert.deepEqual(h.join(tokens[0]).state.journal, journal)
  file.write(h.game.snapshotForSave())
  const resumed = setup(t, { saved: file.load() })
  const partner = resumed.join(tokens[1])
  assert.deepEqual(partner.state.journal, journal)
  choose(partner, staff)
  resumed.advance()
  assert.equal(partner.messages.find(message => message.type === 'field-record').credited, false)
  assert.deepEqual(partner.state.journal, journal)
  const malformed = resumed.game.snapshotForSave()
  malformed.world.journal.records.push(journal.records[0])
  file.write(malformed)
  assert.throws(() => file.load(), error => error.cause?.message === 'Unsupported or malformed save')
})

test('the Juniper lookout records distinct live hare behavior, with stale and long-range requests refused', (t) => {
  const dry = setup(t, { players: [player(0, lookout), player(1)], arrange: save => { save.islandTime = 30 } })
  const a = dry.join(tokens[0]), b = dry.join(tokens[1])
  dry.advanceUntil(() => Boolean(option(a, 'hare-grazing')), 500)
  const grazed = option(a, 'hare-grazing')
  choose(b, grazed)
  dry.advance()
  assert.equal(b.state.journal.records.length, 0)
  dry.advanceUntil(() => !fieldInteractions(a.state, a.player).some(choice => choice.subject === grazed.subject), 500)
  choose(a, grazed)
  dry.advance()
  assert.equal(a.state.journal.records.length, 0)
  dry.advanceUntil(() => Boolean(option(a, 'hare-grazing')), 500)
  choose(a, option(a, 'hare-grazing'))
  dry.advance()
  assert.equal(b.state.journal.records[0].id, 'hare-grazing')
  const save = dry.game.snapshotForSave()
  save.islandTime = 100
  const wet = setup(t, { saved: save })
  const observer = wet.join(tokens[0])
  const partner = wet.join(tokens[1])
  wet.advanceUntil(() => Boolean(option(observer, 'hare-sheltering')), 500)
  choose(observer, option(observer, 'hare-sheltering'))
  wet.advance()
  assert.deepEqual(partner.state.journal.records.map(record => record.id), ['hare-grazing', 'hare-sheltering'])
  assert.ok(partner.state.journal.records[1].seen.rain >= .65)
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
  assert.deepEqual(a.state.journal.records, [{ id: 'place:shellglass' }, { id: 'place:juniper' }])
  assert.deepEqual(b.player.discoveries, ['shellglass', 'juniper'])
  choose(a, option(a, 'place:shellglass'))
  h.advance()
  assert.ok(b.state.journal.records[0].seen)
  assert.equal(a.messages.find(message => message.type === 'field-record').credited, false)
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
