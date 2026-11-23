import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fromThisComputer, readRoadLayouts, roadsSource, roadSavePath, workbenchSave, workbenchSaveHeader } from '../server/workbench-save.ts'

const road = { id: 'fire-road', name: 'Highwood fire road', kind: 'fire-road', points: [{ x: 12, z: 20 }, { x: -40.123, z: 150 }], bends: [3.456] }

test('road layouts are validated before anything is written', () => {
  assert.deepEqual(readRoadLayouts(JSON.stringify([road])), [{ ...road, points: [{ x: 12, z: 20 }, { x: -40.12, z: 150 }], bends: [3.46] }])
  for (const [body, reason] of [
    ['not json', 'JSON'],
    [JSON.stringify({}), 'list'],
    [JSON.stringify([{ ...road, id: '../escape' }]), 'id'],
    [JSON.stringify([{ ...road, kind: 'motorway' }]), 'kind'],
    [JSON.stringify([{ ...road, points: [{ x: 0, z: 0 }] }]), 'dots'],
    [JSON.stringify([{ ...road, points: [{ x: 0, z: 0 }, { x: 1e9, z: 0 }] }]), 'off the island'],
    [JSON.stringify([{ ...road, bends: [] }]), 'bend'],
    [JSON.stringify([{ ...road, maxGrade: [0.9] }]), 'grade'],
    [JSON.stringify([road, road]), 'unique'],
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

function call(handler, { method = 'POST', address = '127.0.0.1', header = 'save', body = '[]' } = {}) {
  return new Promise((resolve) => {
    const listeners = {}
    const on = (event, fn) => {
      listeners[event] = fn
    }
    const request = { method, headers: header ? { [workbenchSaveHeader]: header } : {}, socket: { remoteAddress: address }, setEncoding() {}, on, destroy() {} }
    const response = { statusCode: 0, setHeader() {}, end: (message) => resolve({ status: response.statusCode, message }) }
    handler(request, response)
    listeners.data?.(body)
    listeners.end?.()
  })
}

test('only this computer, with the Workbench header, can save, and only the road layout file', async () => {
  assert.ok(fromThisComputer({ socket: { remoteAddress: '::1' } }))
  assert.ok(!fromThisComputer({ socket: { remoteAddress: '192.168.0.7' } }))
  const root = mkdtempSync(join(tmpdir(), 'island-'))
  mkdirSync(join(root, 'src/worlds/starter/layout'), { recursive: true })
  const handler = middleware(root)
  assert.equal((await call(handler, { address: '192.168.0.7' })).status, 403)
  assert.equal((await call(handler, { header: '' })).status, 403)
  assert.equal((await call(handler, { method: 'GET' })).status, 403)
  assert.equal((await call(handler, { body: '[{"id":"x"}]' })).status, 400)
  assert.equal((await call(handler, { body: JSON.stringify([road]) })).status, 204)
  assert.match(readFileSync(join(root, 'src/worlds/starter/layout/roads.ts'), 'utf8'), /id: 'fire-road'/)
})
