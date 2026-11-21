import assert from 'node:assert/strict'
import { test } from 'node:test'
import { gullAt, gullCycle } from '../src/gull-flight.ts'
import { saltwindGullStops, starterGullPerches } from '../src/gull-sites.ts'
import { surfaceHeight } from '../src/second-island/terrain.ts'
import { groundHeight } from '../src/terrain.ts'
import { pavedYards } from '../src/second-island/sites.ts'
import { harborDockPiles } from '../src/world.ts'

const clear = { hour: 12, rain: 0 }
const wet = { hour: 12, rain: 1 }
const dusk = { hour: 18, rain: 0 }
const perch = { x: 0, y: .705, z: 0, heading: 0 }

test('gulls point along their flight and plant their feet before folding in clear weather, rain and dusk', () => {
  for (const weather of [clear, wet, dusk]) {
    const phases = new Set()
    let previous
    for (let t = 0; t <= 49; t += .025) {
      const bird = gullAt(t, 0, perch, weather)
      phases.add(bird.phase)
      if (bird.grounded) {
        assert.deepEqual([bird.x, bird.y, bird.z], [perch.x, perch.y, perch.z])
        assert.equal(bird.tuck, 0)
        if (bird.phase === 'Settling') assert.equal(previous?.grounded ? true : bird.fold < .02, true)
      } else {
        assert.equal(bird.fold, 0)
        assert.ok(bird.y >= perch.y)
      }
      if (previous) {
        const dx = bird.x - previous.x, dz = bird.z - previous.z
        const travel = Math.hypot(dx, dz)
        assert.ok(travel < .20)
        if (!bird.grounded && !previous.grounded && travel > 1e-5) {
          assert.ok((Math.sin(bird.heading) * dx + Math.cos(bird.heading) * dz) / travel > .98)
        }
      }
      previous = bird
    }
    for (const phase of ['Resting', 'Push-off', 'Climb', 'Glide', 'Approach', 'Flare', 'Settling']) {
      assert.ok(phases.has(phase), phase)
    }
  }
})

test('live weather changes wait until the next circuit and seeking reproduces the same pose', () => {
  const weatherAt = time => time < 18 ? clear : wet
  const landing = gullAt(36, 0, perch, wet, weatherAt)
  assert.equal(landing.phase, 'Flare')
  assert.deepEqual(landing, gullAt(36, 0, perch, clear))
  gullAt(56, 0, perch, wet, weatherAt)
  assert.deepEqual(gullAt(36, 0, perch, wet, weatherAt), landing)
  assert.equal(gullAt(gullCycle(0).period + 7, 0, perch, wet, weatherAt).phase, 'Resting')
  assert.equal(gullAt(gullCycle(0).period + 14, 0, perch, wet, weatherAt).phase, 'Push-off')
  const night = gullAt(22, 0, perch, { hour: 23, rain: 0 })
  assert.equal(night.phase, 'Resting')
  assert.equal(night.fold, 1)
})

test('the two flocks use distinct physical supports and stagger departures', () => {
  const quay = pavedYards.find(({ id }) => id === 'quay')
  const saltwind = saltwindGullStops.map(stop => ({ ...stop, y: surfaceHeight(stop.x, stop.z) }))
  assert.equal(new Set(starterGullPerches.map(p => p.x + ',' + p.z)).size, starterGullPerches.length)
  for (const p of starterGullPerches) {
    assert.ok(harborDockPiles.some(pile => pile.x === p.x && pile.z === p.z && pile.top === p.y && pile.diameter > .22))
  }
  for (const p of saltwind) {
    assert.ok(Math.abs(p.x - quay.x) < quay.width / 2 && Math.abs(p.z - quay.z) < quay.depth / 2)
    assert.equal(p.y, quay.y)
  }
  for (const [perches, ground] of [[starterGullPerches, groundHeight], [saltwind, p => surfaceHeight(p.x, p.z)]]) {
    const departures = perches.map((p, i) => {
      let first
      for (let t = 0; t <= 52; t += .05) {
        const bird = gullAt(t, i, p, wet)
        if (bird.phase === 'Push-off' && first === undefined) first = t
        assert.ok(bird.y >= ground(bird) - 1e-6)
      }
      assert.ok(first !== undefined)
      return first
    })
    assert.equal(new Set(departures).size, perches.length)
  }
})
