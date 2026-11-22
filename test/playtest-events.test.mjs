import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { URLSearchParams } from 'node:url'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { multiplayer } from '../server/multiplayer.ts'
import { playtestEventQuery, readPlaytestEvent } from '../src/playtest-events.ts'
import { wildfireSizes } from '../src/wildfire.ts'
import { tokens } from './support/game-harness.mjs'

const read = (query) => readPlaytestEvent(new URLSearchParams(query))

test('a playtest event survives the trip through its query and refuses unknown choices', () => {
  const event = { type: 'wildfire', size: 'blaze', site: 'juniper-scrub', intensity: 'fierce', located: true }
  assert.deepEqual(readPlaytestEvent(playtestEventQuery(event)), event)
  assert.deepEqual(read('type=wildfire&size=&site='), { type: 'wildfire' })
  assert.deepEqual(read('type=end-wildfire'), { type: 'end-wildfire' })
  for (const query of ['type=flood', 'type=wildfire&size=inferno', 'type=wildfire&site=moon', 'type=wildfire&intensity=hot', 'type=wildfire&located=yes', '']) {
    assert.equal(read(query), undefined, query)
  }
})

test('a solo fire-watch playtest can end its fire and start one of a chosen size, site and heat', () => {
  const game = createGame({ playtest: { checkpoint: 'fire-watch', seats: 1, revision: 1 } })
  const notices = []
  game.join(tokens[0], (notice) => notices.push(notice))
  assert.equal(game.tick().playtest.started, true)
  assert.ok(game.tick().events.fire, 'the checkpoint starts with a fire')

  assert.deepEqual(game.playtestEvent({ type: 'wildfire' }), { ok: false, text: 'A wildfire is already burning. End it first.' })
  assert.equal(game.playtestEvent({ type: 'end-wildfire' }).ok, true)
  let state = game.tick()
  assert.equal(state.events.fire, null)
  assert.equal(state.events.lastFire.outcome, 'burned-out')
  assert.equal(game.playtestEvent({ type: 'end-wildfire' }).ok, false)

  const result = game.playtestEvent({ type: 'wildfire', size: 'blaze', site: 'juniper-scrub', intensity: 'fierce', located: true })
  assert.deepEqual(result, { ok: true, text: 'Brush blaze started at Juniper Hollow scrub.' })
  state = game.tick()
  const fire = state.events.fire
  assert.equal(fire.site, 'juniper-scrub')
  assert.equal(fire.hotspots.length, wildfireSizes.blaze.hotspots)
  assert.equal(fire.located, true)
  for (const spot of fire.hotspots) assert.ok(spot.peak >= 0.775 && spot.peak <= 1, `fierce peak ${spot.peak}`)
  assert.deepEqual(notices.filter((n) => n.type === 'wildfire').map((n) => n.event).slice(-2), ['smoke', 'located'])

  game.playtestEvent({ type: 'end-wildfire' })
  game.playtestEvent({ type: 'wildfire', size: 'spot', intensity: 'mild' })
  for (const spot of game.tick().events.fire.hotspots) assert.ok(spot.peak >= 0.55 && spot.peak <= 0.775, `mild peak ${spot.peak}`)
})

test('an ordinary island refuses playtest events', () => {
  const game = createGame()
  assert.equal(game.playtestEvent({ type: 'wildfire' }).ok, false)
  assert.equal(game.tick().events.fire, null)
})

test('the playtest event endpoint answers only a joined crewmate', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-playtest-events-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const httpServer = new EventEmitter()
  const handlers = new Map()
  multiplayer().configureServer({
    httpServer,
    middlewares: { use(path, handler) { handlers.set(path, handler) } },
    config: { root, mode: 'playtest', server: { port: 5197 } },
  })
  try {
    const call = (method, authorization) => {
      const reply = {}
      handlers.get('/api/playtest-event')({ method, headers: { authorization }, url: '/?type=wildfire' }, {
        setHeader() {},
        writeHead(code) {
          reply.code = code
          return this
        },
        end(text) { reply.text = text },
      })
      return reply
    }
    assert.equal(call('GET').code, 405)
    assert.deepEqual(call('POST', 'Bearer ' + tokens[0]), { code: 403, text: 'Join the crew first.' })
  }
  finally { httpServer.emit('close') }
})
