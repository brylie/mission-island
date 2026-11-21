import assert from 'node:assert/strict'
import test from 'node:test'
import { createDriftwoodSchool, driftwoodShallows } from '../src/simulation/driftwood-school.ts'
import { waterDepth } from '../src/terrain.ts'
import { previewDriftwood } from '../src/workbench/driftwood-preview.ts'
import { skiffStart } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const at = (x, z) => ({ x: driftwoodShallows.x + x, z: driftwoodShallows.z + z })
const ashore = at(0, 5)
const harbor = { ...skiffStart, speed: 0 }

for (const pass of ['wade', 'paddle']) {
  test('shore observer sees the same ' + pass + ' encounter, including across reconnect', (t) => {
    const boating = pass === 'paddle'
    const start = boating ? at(-6, -1.7) : at(0, 3)
    const game = setup(t, {
      players: [player(0, ashore), player(1, start, { seat: boating ? 'port' : null }), player(2, at(2, 5))],
      arrange(save) {
        if (boating) save.world.skiff = { ...start, heading: Math.PI / 2, speed: 0 }
      },
    })
    const observer = game.join(tokens[0])
    let active = game.join(tokens[1])
    let partial = false, regrouped = false, rejoined = false
    let firstStartle, wading = false
    for (let tick = 0; tick < 750; tick++) {
      if (tick % 6 === 0) {
        const z = boating ? Number(tick < 170) : tick < 20 ? -1 : Number(tick < 55)
        game.input(active, { z })
      }
      game.advance()
      const school = observer.state.driftwood
      assert.deepEqual(school, active.state.driftwood)
      const startled = school.fish.filter((f) => f.startled)
      if (startled.length && !firstStartle) firstStartle = school
      if (startled.length && startled.length < 6) partial = true
      if (startled.length && !active.player.swimming && waterDepth(active.player) > 0.04) wading = true
      if (firstStartle && !rejoined) {
        active.close()
        game.advance(3)
        active = game.join(tokens[1])
        assert.deepEqual(active.state.driftwood, observer.state.driftwood)
        rejoined = true
      }
      if (rejoined && school.leader >= 0 && !regrouped) {
        const lateObserver = game.join(tokens[2])
        assert.equal(lateObserver.state.driftwood.leader, school.leader)
        assert.deepEqual(lateObserver.state.driftwood, observer.state.driftwood)
        regrouped = true
      }
    }
    assert.ok(partial && regrouped && rejoined)
    if (!boating) assert.ok(wading)
    assert.ok(waterDepth(observer.player) < 0.01)
    assert.ok(observer.state.driftwood.fish.some((f, i) => Math.hypot(f.x - firstStartle.fish[i].x, f.z - firstStartle.fish[i].z) > 1))
  })
}

test('shore observers and empty parked skiffs leave the shoal undisturbed', () => {
  const a = createDriftwoodSchool(125), b = createDriftwoodSchool(125)
  const parked = { ...driftwoodShallows, heading: 0, speed: 0 }
  const gone = player(1, driftwoodShallows, { connected: false, swimming: true })
  for (let tick = 0; tick < 100; tick++) {
    assert.deepEqual(a.step([player(0, ashore), gone], parked), b.step([], harbor))
  }
})

test('a still swimmer or occupied skiff keeps its space even after the school settles', () => {
  const position = at(0, -1)
  const swimmer = player(0, position, { swimming: true })
  const occupiedSkiff = { ...position, heading: 0, speed: 0 }
  for (const boarding of [false, true]) {
    const school = createDriftwoodSchool(42)
    const crew = boarding ? [{ ...swimmer, seat: 'port' }] : [swimmer]
    const limit = boarding ? 2.9 : 1.9
    const skiff = boarding ? occupiedSkiff : undefined
    let leader = -1
    for (let tick = 0; tick < 900; tick++) {
      const next = school.step(crew, skiff)
      if (tick < 210) continue
      if (tick === 210) {
        leader = next.leader
        assert.ok(leader >= 0)
      }
      assert.equal(next.leader, leader)
      assert.ok(next.fish.every((fish) => !fish.startled && Math.hypot(fish.x - position.x, fish.z - position.z) >= limit - 0.001))
    }
  }
})

test('fish stay submerged and clear of the bed when pincered against the shelf', () => {
  for (const seed of [0, 1, 42, 125, 9999]) {
    const school = createDriftwoodSchool(seed)
    let frame = school.frame()
    for (let t = 0; t < 1500; t++) {
      const wader = player(0, at(-1 + 4 * Math.sin(t / 70), 1), { swimming: true })
      const skiff = { ...at(4 * Math.cos(t / 80), -1.5), heading: 0, speed: 2 }
      frame = school.step([wader], skiff)
      for (const fish of frame.fish) assert.ok(waterDepth(fish) >= 0.479)
    }
    for (let t = 0; t < 200; t++) frame = school.step([], harbor)
    assert.ok(frame.leader >= 0 && frame.fish.every((f) => !f.startled))
  }
})

test('the landscape preview reproduces the resting school across seeks and frame rates', () => {
  const scrub = previewDriftwood(), playback = previewDriftwood()
  const later = scrub(18)
  const earlier = scrub(3)
  for (let i = 0; i < 90; i++) playback(i / 30)
  assert.deepEqual(earlier, playback(3))
  assert.deepEqual(later, scrub(18))
  assert.deepEqual(scrub(1e12), playback(96))
})
