import assert from 'node:assert/strict'
import { test } from 'node:test'
import { crewMarkFeedback } from '../src/crew-mark-notices.ts'
import { igniteFire } from '../server/wildfire.ts'
import { fireWatchGeometry } from '../src/assets/geometry/fire-watch.ts'
import { fireFinder } from '../src/fire-watch.ts'
import { markCooldownMs, rangefinderReachM } from '../src/spotting.ts'
import { fireWatchBaseHeight, walkingHeight } from '../src/terrain.ts'
import { daySeconds } from '../src/weather.ts'
import { distance } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

// Invariant: every crewmate has at most one mark, placed only by someone on foot within the rangefinder's reach,
// standing on the host's own ground, and gone when its placer leaves.

const deck = { ...fireFinder, x: fireFinder.x + 0.9 }
const onDeck = (id = 0) => player(id, deck, { y: fireWatchBaseHeight() + fireWatchGeometry.deck.top })
const nearby = (dx, dz) => ({ x: deck.x + dx, z: deck.z + dz })
const notices = (client, event) => client.messages.filter((message) => message.type === 'crew-mark' && message.event === event)

function mark(h, client, point) {
  client.request('mark', point)
  h.advance()
}

test('a mark stands on the host ground, and the whole crew hears who placed it', (t) => {
  const h = setup(t, { players: [onDeck(), player(1)] })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  const spot = nearby(-30, 12)
  a.request('mark', { ...spot, y: 900 })
  h.advance()
  assert.equal(b.state.marks.length, 1)
  const [placed] = b.state.marks
  assert.equal(placed.playerId, 0)
  assert.ok(Math.abs(placed.y - walkingHeight(spot)) < 1e-9, 'The client’s height is ignored')
  assert.deepEqual(notices(b, 'placed').map(({ playerId, x, z }) => ({ playerId, x, z })), [{ playerId: 0, ...spot }])
})

test('a new mark replaces the old one, but not within the cooldown', (t) => {
  const h = setup(t, { players: [onDeck(), player(1)] })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  mark(h, a, nearby(-30, 0))
  mark(h, b, nearby(10, 10))
  mark(h, a, nearby(-40, 0))
  assert.equal(a.state.marks.find((each) => each.playerId === 0).x, deck.x - 30, 'A click inside the cooldown is ignored')
  h.elapse(markCooldownMs)
  mark(h, a, nearby(-40, 0))
  assert.equal(a.state.marks.length, 2, 'One mark per crewmate')
  assert.equal(a.state.marks.find((each) => each.playerId === 0).x, deck.x - 40)
  assert.equal(notices(b, 'placed').filter(({ playerId }) => playerId === 0).length, 2)
})

test('the host refuses malformed, out-of-reach and busy marks', (t) => {
  const h = setup(t, { players: [onDeck(), player(1, undefined, { seat: 'passenger' })] })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  for (const bad of [{ x: 'far', z: 0 }, { x: 1 }, { x: null, z: null }, { x: 'Infinity', z: 0 }]) mark(h, a, bad)
  assert.deepEqual(a.state.marks, [], 'Malformed marks are dropped')
  mark(h, a, nearby(rangefinderReachM + 20, 0))
  assert.deepEqual(notices(a, 'refused').map(({ reason }) => reason), ['reach'])
  mark(h, b, nearby(5, 5))
  assert.deepEqual(notices(b, 'refused').map(({ reason }) => reason), ['busy'], 'A seated crewmate cannot mark')
  assert.deepEqual(a.state.marks, [])
})

test('clearing removes only your own mark and tells the crew once', (t) => {
  const h = setup(t, { players: [onDeck(), player(1)] })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  mark(h, a, nearby(-30, 0))
  mark(h, b, nearby(8, 4))
  a.request('clear-mark')
  h.advance()
  a.request('clear-mark')
  h.advance()
  assert.deepEqual(b.state.marks.map(({ playerId }) => playerId), [1])
  assert.deepEqual(notices(b, 'cleared').map(({ playerId }) => playerId), [0])
})

test('a crewmate who leaves takes their mark, so the next crewmate in that slot starts without one', (t) => {
  const h = setup(t, { players: [onDeck(), player(1)] })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  mark(h, a, nearby(-30, 0))
  a.close()
  h.advance()
  assert.deepEqual(b.state.marks, [])
  const back = h.join(tokens[0])
  assert.deepEqual(back.state.marks, [])
  assert.ok(!('marks' in h.game.snapshotForSave().world), 'Marks never reach the save')
})

test('a mark near a burning hotspot locates the fire, as the fire finder does', (t) => {
  let fire
  const h = setup(t, {
    players: [onDeck(), player(1)],
    arrange(save) {
      save.islandTime = daySeconds + 80
      Object.assign(save.world, { mission: 'complete', fire: 0 })
      fire = igniteFire(save.world.events, save.islandTime, { site: 'meadow-slope', size: 'spot' })
    },
  })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  const spot = fire.hotspots[0]
  assert.ok(distance(spot, deck) > 8, 'The fire is out of sight range of the tower')
  mark(h, a, { x: spot.x + 20, z: spot.z })
  assert.equal(a.state.events.fire.located, false, 'A mark 20 m off does not find it')
  h.elapse(markCooldownMs)
  mark(h, a, { x: spot.x + 5, z: spot.z })
  assert.equal(a.state.events.fire.located, true)
  const located = b.messages.findIndex((message) => message.type === 'wildfire' && message.event === 'located')
  assert.equal(b.messages[located].playerId, 0)
  const marked = b.messages.findLastIndex((message) => message.type === 'crew-mark' && message.event === 'placed')
  assert.ok(marked > located, 'The mark notice comes last, so the crew reads who marked the fire')
  assert.equal(b.messages[marked].fire, true)
  assert.equal(notices(b, 'placed')[0].fire, undefined, 'A mark away from the fire does not claim it')
})

test('crewmates read who marked a spot and where it lies from them, and the placer reads a confirmation', () => {
  const snapshot = { players: [{ id: 0, name: 'Ana', x: 0, z: 0 }, { id: 1, name: '', x: 0, z: 0 }] }
  const placed = { type: 'crew-mark', event: 'placed', playerId: 0, x: -84, z: 0 }
  assert.equal(crewMarkFeedback(placed, 1, snapshot).label, 'Ana marked a spot · 84 m west')
  assert.equal(crewMarkFeedback(placed, 0, snapshot).label, 'Marked for the crew')
  assert.equal(crewMarkFeedback({ ...placed, fire: true }, 1, snapshot).label, 'Ana marked the fire · 84 m west')
  assert.equal(crewMarkFeedback({ ...placed, fire: true }, 0, snapshot).label, 'Fire marked for the crew')
  assert.equal(crewMarkFeedback({ type: 'crew-mark', event: 'cleared', playerId: 0 }, 0, snapshot).label, 'Mark cleared')
  assert.equal(crewMarkFeedback({ ...placed, playerId: 1 }, 0, snapshot).label, 'Crew 2 marked a spot · 84 m west')
  assert.equal(crewMarkFeedback(placed, 2, snapshot).label, 'Ana marked a spot')
  assert.equal(crewMarkFeedback({ type: 'crew-mark', event: 'cleared', playerId: 0 }, 1, snapshot).label, 'Ana cleared their mark')
  assert.equal(crewMarkFeedback({ type: 'crew-mark', event: 'refused', reason: 'reach' }, 0, snapshot).label, 'Too far for the rangefinder to mark')
})
