import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fromThisComputer, fromThisSite, readRoadLayouts, roadsSource, workbenchSave } from '../server/workbench-save.ts'
import { gradedRoadKinds } from '../src/assets/geometry/road-kinds.ts'
import { roadSavePath, workbenchSaveHeader } from '../src/workbench-save-contract.ts'

const road = { id: 'fire-road', name: 'Highwood fire road', kind: 'fire-road', points: [{ x: 12, z: 20 }, { x: -40.123, z: 150 }], bends: [3.456] }

test('road layouts are validated before anything is written', () => {
  assert.deepEqual(readRoadLayouts(JSON.stringify([road])), [{ ...road, points: [{ x: 12, z: 20 }, { x: -40.12, z: 150 }], bends: [3.46] }])
  for (const [body, reason] of [
    ['not json', 'JSON'],
    [JSON.stringify({}), 'list'],
    [JSON.stringify([{ ...road, id: '../escape' }]), 'id'],
    [JSON.stringify([{ ...road, kind: 'motorway' }]), 'kind'],
    // Inherited names and the village's paved kind are not kinds the designer lays.
    [JSON.stringify([{ ...road, kind: 'toString' }]), 'Highwood fire road has an unknown kind'],
    [JSON.stringify([{ ...road, kind: 'paved' }]), 'Highwood fire road has an unknown kind'],
    [JSON.stringify([{ ...road, name: '' }]), 'road 1 needs a name'],
    [JSON.stringify([{ ...road, points: [road.points[0], { x: 1e6, z: 0 }] }]), 'Highwood fire road has dot 2 off the island'],
    [JSON.stringify([{ ...road, points: [{ x: 0, z: 0 }] }]), 'dots'],
    [JSON.stringify([{ ...road, points: [{ x: 0, z: 0 }, { x: 1e9, z: 0 }] }]), 'off the island'],
    [JSON.stringify([{ ...road, bends: [] }]), 'bend'],
    [JSON.stringify([{ ...road, maxGrade: [0.9] }]), 'grade'],
    [JSON.stringify([road, road]), 'unique: Highwood fire road and Highwood fire road'],
  ]) {
    const result = readRoadLayouts(body)
    assert.equal(typeof result, 'string')
    assert.match(result, new RegExp(reason))
  }
})

test('the saved source is the layout module the game reads', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'roads-'))
  const file = join(dir, 'roads.ts')
  writeFileSync(file, roadsSource([{ ...road, name: 'Bob\'s "road"', maxGrade: [0.18] }]))
  const { starterRoads } = await import(file)
  assert.equal(starterRoads[0].name, 'Bob\'s "road"')
  assert.deepEqual(starterRoads[0].maxGrade, [0.18])
  assert.match(roadsSource([]), /starterRoads: readonly StarterRoadLayout\[\] = \[\]/)
  assert.match(roadsSource([]), new RegExp(`kind: ${gradedRoadKinds.map((kind) => `'${kind}'`).join(' \\| ')}\n`), 'the kind type is written from the graded road kinds')
})

test('the checked-in road layout matches what a save would write', () => {
  const source = readFileSync(join(import.meta.dirname, '../src/worlds/starter/layout/roads.ts'), 'utf8')
  const header = roadsSource([]).split('export const starterRoads')[0]
  assert.ok(source.startsWith(header), 'roads.ts starts with the generated header')
})

function middleware(root) {
  let handler
  const use = (path, fn) => {
    assert.equal(path, roadSavePath)
    handler = fn
  }
  workbenchSave(root).configureServer({ middlewares: { use } })
  return handler
}

const host = 'localhost:5173'
function call(handler, { method = 'POST', address = '127.0.0.1', header = 'save', body = '[]', origin = `http://${host}`, site } = {}) {
  return new Promise((resolve) => {
    const listeners = {}
    const on = (event, fn) => {
      listeners[event] = fn
    }
    const headers = { host, ...(origin && { origin }), ...(site && { 'sec-fetch-site': site }), ...(header && { [workbenchSaveHeader]: header }) }
    const request = { method, headers, socket: { remoteAddress: address }, setEncoding() {}, on, destroy() {} }
    const response = { statusCode: 0, setHeader() {}, end: (message) => resolve({ status: response.statusCode, message }) }
    handler(request, response)
    listeners.data?.(body)
    listeners.end?.()
  })
}

test('the same-origin check reads the headers the browser sets', () => {
  assert.ok(fromThisSite({ headers: { host, origin: `https://${host}` } }))
  assert.ok(!fromThisSite({ headers: { host, origin: 'http://evil.localhost:5173' } }))
  assert.ok(!fromThisSite({ headers: { origin: `http://${host}` } }))
  assert.ok(fromThisSite({ headers: { 'host': '127.0.0.1:5173', 'sec-fetch-site': 'same-origin' } }))
  // A page whose own domain was rebound to 127.0.0.1 is same-origin with itself.
  assert.ok(!fromThisSite({ headers: { 'host': 'evil.test:5173', 'origin': 'http://evil.test:5173', 'sec-fetch-site': 'same-origin' } }), 'a rebound domain is refused')
})

test('only this computer, from the Workbench page, with the Workbench header, can save, and only the road layout file', async () => {
  assert.ok(fromThisComputer({ socket: { remoteAddress: '::1' } }))
  assert.ok(!fromThisComputer({ socket: { remoteAddress: '192.168.0.7' } }))
  const root = mkdtempSync(join(tmpdir(), 'island-'))
  mkdirSync(join(root, 'src/worlds/starter/layout'), { recursive: true })
  const handler = middleware(root)
  assert.equal((await call(handler, { address: '192.168.0.7' })).status, 403)
  assert.equal((await call(handler, { header: '' })).status, 403)
  assert.equal((await call(handler, { method: 'GET' })).status, 403)
  assert.equal((await call(handler, { origin: 'http://localhost:4000' })).status, 403, 'another local site is refused')
  assert.equal((await call(handler, { origin: 'http://localhost:4000', site: 'same-site' })).status, 403)
  assert.equal((await call(handler, { origin: '' })).status, 403, 'a request that names no page is refused')
  assert.equal((await call(handler, { origin: '', site: 'same-origin', body: JSON.stringify([road]) })).status, 204)
  assert.equal((await call(handler, { body: '[{"id":"x"}]' })).status, 400)
  assert.equal((await call(handler, { body: JSON.stringify([road]) })).status, 204)
  assert.match(readFileSync(join(root, 'src/worlds/starter/layout/roads.ts'), 'utf8'), /id: 'fire-road'/)
})
