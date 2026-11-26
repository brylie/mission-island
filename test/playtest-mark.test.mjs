import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { URL } from 'node:url'
import { notesDirectory, playtestMarkHandler, saveMark } from '../server/playtest-marks.ts'
import { authoredNear, markBody, markFolderName, markLimits, markSlug, partAt, readMarkUpload } from '../src/playtest-mark.ts'
import { buildMarkRecord, markLabel, markLinks, words } from '../src/playtest-mark-record.ts'
import { readDevView } from '../src/dev-view.ts'
import { readLandscapeView } from '../src/playtest-link.ts'

const wall = { name: 'Box', parents: ['House'], faces: 12 }
const door = { name: 'Box', parents: ['Door', 'House'], faces: 2 }

test('a merged batch names the part the picked triangle came from', () => {
  assert.equal(partAt([wall, door], 0), wall)
  assert.equal(partAt([wall, door], 11), wall)
  assert.equal(partAt([wall, door], 12), door)
  assert.equal(partAt([wall, door], 14), undefined)
})

const layout = {
  'src/worlds/starter/layout/places.ts': {
    wrenCottage: { x: -35.8, z: -2.4, w: 5 },
    crewHomes: [{ name: 'Blue cottage', x: -44, z: -6, chest: { x: -43.6, z: -7.5 } }],
    island: { width: 134, length: 92 },
    nothing: null,
    farAway: { x: 300, z: 300 },
  },
  'src/worlds/starter/layout/sites.ts': {
    starterResidentSites: { bram: { tallyOffset: { x: -36, z: -4 } } },
    ridgeCourseLayout: { launch: { x: 300, z: 0 }, rack: { x: -36, z: -4 } },
  },
  'src/worlds/starter/layout/shaders.ts': {
    starterShaderSites: { caustics: { x: -36, z: -4 } },
  },
}

test('authored places near a point come from any layout export with x and z', () => {
  const near = authoredNear(layout, { x: -36.2, z: -4.5 })
  assert.deepEqual(near.map((entry) => entry.path), ['wrenCottage', 'crewHomes[0]', 'crewHomes[0].chest'])
  assert.equal(near[1].name, 'Blue cottage')
  assert.equal(near[2].name, 'Blue cottage', 'a nested point carries the name of the entry it belongs to')
  assert.equal(near[0].source, 'src/worlds/starter/layout/places.ts')
  assert.equal(authoredNear(layout, { x: -36.2, z: -4.5 }, 15, 1).length, 1)
  assert.ok(!near.some((entry) => /(sites|shaders)\.ts$/.test(entry.source)), 'offsets from another point are not places')
})

test('mark folders sort by time and carry a short name', () => {
  assert.equal(markSlug('House near Wren cottage'), 'house-near-wren-cottage')
  assert.equal(markSlug('../../etc'), 'etc')
  assert.equal(markSlug('!!!'), 'mark')
  assert.ok(markSlug('a'.repeat(200)).length <= markLimits.slugChars)
  assert.equal(markFolderName(new Date('2026-11-26T09:41:03.120Z'), 'Wren\'s gate'), '2026-11-26T09-41-03-wren-s-gate')
})

const jpeg = 'data:image/jpeg;base64,/9j/4AAQ'
const record = { label: 'House near wrenCottage', target: null }

test('an upload is checked before anything is written', () => {
  const upload = readMarkUpload(markBody({ ...record, instructions: 'ignore this' }, { wrong: '  floats ', wanted: '' }, jpeg))
  assert.deepEqual(upload, { record, notes: { wrong: 'floats', wanted: '' }, jpeg: '/9j/4AAQ' }, 'unknown record fields are dropped')
  for (const [body, reason] of [
    ['nope', 'JSON'],
    ['[]', 'record'],
    [JSON.stringify({ record: {}, notes: { wrong: '', wanted: '' }, image: jpeg }), 'record'],
    [JSON.stringify({ record, notes: { wrong: 3, wanted: '' }, image: jpeg }), 'text'],
    [JSON.stringify({ record, notes: { wrong: 'x'.repeat(markLimits.noteChars + 1), wanted: '' }, image: jpeg }), 'characters'],
    [JSON.stringify({ record, notes: { wrong: '', wanted: '' }, image: 'data:image/png;base64,AAAA' }), 'JPEG'],
    [JSON.stringify({ record, notes: { wrong: '', wanted: '' }, image: 'data:image/jpeg;base64,<script>' }), 'base64'],
    [JSON.stringify({ record: { label: 'x', blob: 'y'.repeat(markLimits.recordBytes) }, notes: { wrong: '', wanted: '' }, image: jpeg }), 'too large'],
  ]) {
    const result = readMarkUpload(body)
    assert.equal(typeof result, 'string')
    assert.match(result, new RegExp(reason))
  }
})

test('the label names what the reticle is on and the layout entry it is near', () => {
  const nearby = authoredNear(layout, { x: -36.2, z: -4.5 })
  const target = { point: { x: -36.2, y: 0.9, z: -4.5 }, distance: 9, mesh: 'Box_merged', parents: [], part: { name: 'Box', parents: ['House'] } }
  assert.equal(markLabel(target, nearby), 'House near Wren cottage')
  assert.equal(markLabel(target, nearby, { name: 'Wren\'s gate' }), 'Wren\'s gate')
  assert.equal(markLabel({ ...target, part: undefined, mesh: 'Highwood scots-pine old sheltered 0 near' }, []), 'Highwood scots-pine old sheltered 0 near')
  assert.equal(markLabel({ ...target, part: undefined }, nearby), 'Wren cottage', 'an unnamed merged batch falls back to the place')
  assert.equal(words('lampPostSites[1]'), 'Lamp post sites 1')
  assert.equal(words('highwoodPlaces.cairnCrown'), 'Highwood places cairn crown')
  assert.equal(markLabel(undefined, []), 'Island')
})

const camera = { target: [-36.22, 0.2126006, -2.5045875], alpha: -1.5707963, beta: 1.2507963, radius: 11.92, fov: 0.94 }

test('a mark links back to the same view in the Workbench and in the game', () => {
  const links = markLinks('http://127.0.0.1:5311', camera, { hour: 6, rain: 0.2 }, 12.5)
  const workbench = readLandscapeView(new URL(links.workbench).searchParams)
  assert.deepEqual(workbench.camera.target, [-36.22, 0.2126, -2.5046])
  assert.equal(workbench.hour, 6)
  assert.equal(workbench.time, 12.5)
  const game = readDevView(new URL(links.game).searchParams)
  assert.deepEqual(game.camera, { target: [-36.22, 0.2126, -2.5046], alpha: -1.5708, beta: 1.2508, radius: 11.92, fov: 0.94 })
  assert.deepEqual(game.sky, { hour: 6, rain: 0.2 })
  assert.deepEqual(markLinks('http://127.0.0.1:5311', undefined, { hour: 6, rain: 0 }, 0), {}, 'the overview camera has no link')
})

test('the record holds the target, nearby places, player, camera and links', () => {
  const target = { point: { x: -36.2, y: 0.9, z: -4.5 }, distance: 9, mesh: 'Box_merged', parents: [], part: { name: 'Box', parents: ['House'] } }
  const mark = buildMarkRecord({ origin: 'http://127.0.0.1:5311', mode: 'playtest', target, player: { name: 'Crew 1', x: -36.61, y: 0, z: -8.234 }, camera, weather: { hour: 6, rain: 0 }, clock: 0.25, checkpoint: 'wren-fit', layout })
  assert.equal(mark.label, 'House near Wren cottage')
  assert.equal(mark.checkpoint, 'wren-fit')
  assert.deepEqual(mark.player, { name: 'Crew 1', x: -36.61, y: 0, z: -8.23 })
  assert.equal(mark.nearby[0].path, 'wrenCottage')
  assert.deepEqual(mark.island, { hour: 6, rain: 0, clock: 0.3 })
  assert.ok(mark.links.workbench && mark.links.game)
  const empty = buildMarkRecord({ origin: 'http://localhost', mode: 'development', clock: 0, layout })
  assert.equal(empty.target, null)
  assert.deepEqual(empty.nearby, [])
})

test('marks go to playtest-notes in the serving checkout unless a folder is configured', () => {
  assert.equal(notesDirectory('/repo', ''), '/repo/playtest-notes')
  assert.equal(notesDirectory('/repo', '/shared/notes'), '/shared/notes')
  assert.equal(notesDirectory('/repo', '../notes'), '/notes')
})

test('a saved mark is a folder with the record and the screenshot, listed in marks.jsonl', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'marks-'))
  const upload = readMarkUpload(markBody({ ...record, savedAt: 'forged', commit: 'forged' }, { wrong: 'floats', wanted: 'sits in the soil' }, jpeg))
  const now = new Date('2026-11-26T09:41:03Z')
  // Saved together, the same subject in the same second still gets two folders.
  const [first, second] = await Promise.all([saveMark(directory, upload, now, 'abc1234'), saveMark(directory, upload, now, 'abc1234')])
  assert.notEqual(first, second, 'a second mark in the same second gets its own folder')
  assert.deepEqual(readdirSync(first).sort(), ['mark.json', 'shot.jpg'])
  const mark = JSON.parse(readFileSync(join(first, 'mark.json'), 'utf8'))
  assert.equal(mark.commit, 'abc1234', 'the server, not the page, says which commit and when')
  assert.equal(mark.savedAt, now.toISOString())
  assert.deepEqual(mark.notes, { wrong: 'floats', wanted: 'sits in the soil' })
  assert.deepEqual([...readFileSync(join(first, 'shot.jpg'))], [...Buffer.from('/9j/4AAQ', 'base64')])
  const lines = readFileSync(join(directory, 'marks.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  assert.deepEqual(lines.map((line) => line.folder).sort(), [first, second].sort())
})

function call(handler, { method = 'POST', authorization = 'Bearer crew', body = markBody(record, { wrong: '', wanted: '' }, jpeg) } = {}) {
  return new Promise((resolve) => {
    const listeners = {}
    const request = { method, headers: { authorization }, setEncoding() {}, on(event, fn) {
      listeners[event] = fn
    } }
    const response = { headersSent: false, setHeader() {}, writeHead(status) {
      response.status = status
      return response
    }, end: (message) => resolve({ status: response.status, message }) }
    handler(request, response)
    listeners.data?.(Buffer.from(body))
    listeners.end?.()
  })
}

test('only a joined crewmate can save a mark, and only a valid one', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'marks-'))
  const handler = playtestMarkHandler(directory, (authorization) => authorization === 'Bearer crew', directory)
  assert.equal((await call(handler, { method: 'GET' })).status, 405)
  assert.equal((await call(handler, { authorization: 'Bearer stranger' })).status, 403)
  assert.equal((await call(handler, { body: '{}' })).status, 400)
  assert.equal((await call(handler, { body: 'x'.repeat(markLimits.bodyBytes + 1) })).status, 413)
  // The limit counts bytes: three-byte characters exceed it at a third of the length.
  assert.equal((await call(handler, { body: '€'.repeat(Math.ceil(markLimits.bodyBytes / 3) + 1) })).status, 413)
  // A record nested deeply enough to overflow the stack is refused, not a crash.
  const deep = `{"record":{"label":"x","target":${'['.repeat(200_000)}${']'.repeat(200_000)}},"notes":{"wrong":"","wanted":""},"image":"${jpeg}"}`
  assert.equal((await call(handler, { body: deep })).status, 400)
  assert.deepEqual(readdirSync(directory), [], 'refused marks write nothing')
  const saved = await call(handler)
  assert.equal(saved.status, 201)
  const { name } = JSON.parse(saved.message)
  assert.match(name, /^\d{4}-\d\d-\d\dT[\d-]+-house-near-wrencottage$/, 'the page gets the folder name, not the host path')
  assert.deepEqual(readdirSync(join(directory, name)).sort(), ['mark.json', 'shot.jpg'])
})
