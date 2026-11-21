import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { multiplayer } from '../server/multiplayer.ts'
import { islandSaveFile } from '../server/save.ts'

test('a playtest host ignores the named regular save at startup and shutdown', t => {
  const root = mkdtempSync(join(tmpdir(), 'mission-playtest-isolation-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const slot = 'family'
  const port = 5194
  const original = createGame().snapshotForSave()
  original.crewCoins = 73
  islandSaveFile(root, port, slot).write(original)
  const dir = join(root, '.mission-island', 'saves')
  const path = join(dir, slot + '.json')
  const before = readFileSync(path)
  const mode = process.env.MISSION_ISLAND_SAVE
  process.env.MISSION_ISLAND_SAVE = slot
  t.after(() => {
    if (mode === undefined) delete process.env.MISSION_ISLAND_SAVE
    else process.env.MISSION_ISLAND_SAVE = mode
  })
  const httpServer = new EventEmitter()
  const handlers = new Map()
  multiplayer().configureServer({
    httpServer, middlewares: { use(path, handler) { handlers.set(path, handler) } },
    config: { root, mode: 'playtest', server: { port } },
  })
  try {
    let coins
    handlers.get('/api/crew-bank')({ method: 'GET' }, {
      setHeader() {}, writeHead() { return this }, end(body) { coins = JSON.parse(body).crewCoins },
    })
    assert.equal(coins, 0)
    assert.ok(handlers.has('/api/live-checkpoint'))
  } finally { httpServer.emit('close') }
  assert.deepEqual(readFileSync(path), before)
  assert.deepEqual(readdirSync(dir), [slot + '.json'])
})
