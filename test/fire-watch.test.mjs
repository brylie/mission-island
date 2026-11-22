import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fireWatchGeometry } from '../src/assets/geometry/fire-watch.ts'
import { fireWatchPoint, onFireWatchDeck } from '../src/fire-watch.ts'
import { stepPlayerOnTerrain } from '../src/simulation/movement.ts'
import { fireWatchBaseHeight, walkingHeight } from '../src/terrain.ts'
import { crateSize, jumpSpeed } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const tick = 1 / 30
const deckTop = fireWatchBaseHeight() + fireWatchGeometry.deck.top

function walker(x, z) {
  const start = fireWatchPoint(x, z)
  const player = { ...start, y: walkingHeight(start), heading: 0, grounded: true, onBed: false, swimming: false }
  return { player, verticalSpeed: 0 }
}

function walk(motion, to, { ticks = 120, jumping = false } = {}) {
  const goal = fireWatchPoint(...to)
  for (let step = 0; step < ticks; step++) {
    const { player } = motion
    const dx = goal.x - player.x, dz = goal.z - player.z, length = Math.hypot(dx, dz)
    if (length < 0.25) return true
    if (jumping && player.grounded) {
      motion.verticalSpeed = jumpSpeed
      player.grounded = false
    }
    stepPlayerOnTerrain(motion, [], { x: dx / length, z: dz / length }, false, tick, () => -Infinity)
  }
  return false
}

test('the switchback stairs carry a crewmate from the trail to the Fire Watch deck', () => {
  const { entrance } = fireWatchGeometry
  const motion = walker(entrance.x, entrance.z)
  // East flight north, middle flight south, west flight north to the deck.
  for (const point of [[1.5, -8.6], [1.5, -2.9], [0, -2.9], [0, -7.7], [-1.5, -7.7], [-1.5, -2.9], [-1.5, 0], [0, 0]]) {
    assert.ok(walk(motion, point), `reached ${point}`)
  }
  assert.equal(motion.player.y, deckTop)
  assert.ok(onFireWatchDeck(motion.player, fireWatchBaseHeight()))
})

test('rails keep walkers and jumpers on the deck, and the tower base cannot be walked into', () => {
  for (const edge of [[3, 0], [0, 3], [-3, 0], [1.5, -1.5 - 1]]) {
    for (const jumping of [false, true]) {
      const motion = walker(0, 0)
      walk(motion, edge, { jumping })
      assert.ok(motion.player.y >= deckTop - 0.01, `stayed on the deck toward ${edge}${jumping ? ' jumping' : ''}`)
    }
  }
  const outside = walker(-5, 0)
  walk(outside, [0, 0])
  assert.equal(outside.player.y, walkingHeight(fireWatchPoint(-5, 0)))
  assert.ok(fireWatchPoint(0, 0).x - outside.player.x > fireWatchGeometry.deck.area[1])
})

test('a crate set down on the deck rests on it and can be picked up again', (t) => {
  const deckPoint = fireWatchPoint(1.6, 1.5)
  const h = setup(t, {
    players: [player(0, deckPoint, { y: deckTop })],
    arrange: (save) => void (save.world.items[0].holder = 0),
  })
  const a = h.join(tokens[0])
  a.request('interact')
  h.advance(60)
  const crate = a.state.items[0]
  assert.equal(crate.holder, null)
  assert.ok(Math.abs(crate.y - (deckTop + crateSize / 2)) < 0.1, `crate rests at ${crate.y}`)
  a.request('interact')
  h.advance()
  assert.equal(a.state.items[0].holder, 0)
})
