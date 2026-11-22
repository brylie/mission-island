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
import { playtestPlaces } from '../src/playtest-places.ts'
import { walkingHeight } from '../src/terrain.ts'
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

test('a playtest crewmate can go to a named place, standing on its ground', () => {
  assert.deepEqual(readPlaytestEvent(playtestEventQuery({ type: 'go-to', place: 'cairn-summit' })), { type: 'go-to', place: 'cairn-summit' })
  assert.equal(read('type=go-to&place=moon'), undefined)
  assert.equal(read('type=go-to'), undefined)
  const game = createGame({ playtest: { checkpoint: 'fire-watch', seats: 1, revision: 1 } })
  game.join(tokens[0], () => {})
  game.tick()
  assert.equal(game.playtestEvent({ type: 'go-to', place: 'cairn-summit' }, 'unknown').ok, false)
  assert.deepEqual(game.playtestEvent({ type: 'go-to', place: 'cairn-summit' }, tokens[0]), { ok: true, text: 'Sent to Cairn Summit.' })
  const player = game.tick().players[0]
  const summit = playtestPlaces.find(({ id }) => id === 'cairn-summit').point
  assert.ok(Math.hypot(player.x - summit.x, player.z - summit.z) < 1, `${player.x}, ${player.z}`)
  assert.ok(Math.abs(player.y - walkingHeight(player)) < 0.5)
  game.playtestEvent({ type: 'go-to', place: 'fire-watch-deck' }, tokens[0])
  assert.ok(game.tick().players[0].y > walkingHeight({ x: 10000, z: 10000 }) + 5, 'the deck is up the tower')

  // Arriving resets the crewmate as respawn does, and the barrow must be set down first.
  const state = game.tick()
  Object.assign(state.players[0], { sleeping: true, onBed: true, rowing: true })
  game.playtestEvent({ type: 'go-to', place: 'bracken' }, tokens[0])
  const arrived = game.tick().players[0]
  assert.deepEqual([arrived.sleeping, arrived.onBed, arrived.rowing], [false, false, false])
  // A hero view's spot faces the view's target.
  game.playtestEvent({ type: 'go-to', place: 'hero-ridge-south' }, tokens[0])
  const hero = playtestPlaces.find(({ id }) => id === 'hero-ridge-south')
  assert.equal(game.tick().players[0].heading, hero.heading)
  state.players[0].seat = 'driver'
  assert.deepEqual(game.playtestEvent({ type: 'go-to', place: 'bracken' }, tokens[0]), { ok: false, text: 'Leave your seat or land first.' })
  state.players[0].seat = null
  state.farmWork.barrow = { handler: arrived.id }
  assert.deepEqual(game.playtestEvent({ type: 'go-to', place: 'cairn-summit' }, tokens[0]), { ok: false, text: 'Set down the barrow first.' })
})
