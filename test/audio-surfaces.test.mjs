import assert from 'node:assert/strict'
import { test } from 'node:test'
import { footstepCue, renderFootstep } from '../src/audio/footstep-recipes.ts'
import { footGround, groundSurface } from '../src/audio/surface.ts'
import { highpass, recipeRate } from '../src/audio/dsp.ts'
import { roads, walkways } from '../src/routes.ts'
import { coastPoint, grove, pool } from '../src/terrain.ts'

const walker = { seat: null, grounded: true, swimming: false }
const rms = (buffer) => Math.sqrt(buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length)
const brightness = (buffer) => rms(highpass(buffer, 2000)) / rms(buffer)
const surfaces = ['gravel', 'sand', 'boards', 'pavement', 'grass', 'litter', 'shallows', 'fallback']

test('roads and Seabrook walks are paved, the woods are leaf litter and open meadow is grass', () => {
  assert.equal(groundSurface(roads[0][0]), 'pavement')
  assert.equal(groundSurface(walkways[0].points[0]), 'pavement')
  assert.equal(groundSurface(grove), 'litter')
  assert.equal(groundSurface(pool), 'litter')
  assert.equal(groundSurface({ x: -40, z: 8 }), 'grass')
  assert.equal(groundSurface(coastPoint(5.3, 1.01)), 'shallows')
})

test('rain soaks grass and earth before paving, and the wet sand is always damp', () => {
  const meadow = { x: -40, z: 8 }
  assert.deepEqual(footGround(meadow, walker, 0), { surface: 'grass', damp: false })
  assert.deepEqual(footGround(meadow, walker, 0.4), { surface: 'grass', damp: true })
  assert.equal(footGround(roads[0][0], walker, 0.4).damp, false)
  assert.equal(footGround(roads[0][0], walker, 0.7).damp, true)
  assert.equal(footGround(coastPoint(5.3, 0.985), walker, 0).damp, true)
  assert.equal(footGround(coastPoint(5.3, 0.93), walker, 0).damp, false)
})

test('every surface renders a bounded, repeatable footstep that differs by seed', () => {
  for (const surface of surfaces) {
    for (const damp of [false, true]) {
      const first = renderFootstep({ surface, strength: 0.5, damp }, 3)
      assert.deepEqual(renderFootstep({ surface, strength: 0.5, damp }, 3), first)
      assert.notDeepEqual(renderFootstep({ surface, strength: 0.5, damp }, 4), first)
      assert.ok(first.length <= 0.4 * recipeRate)
      for (const value of first) assert.ok(Number.isFinite(value) && Math.abs(value) <= 1)
    }
  }
})

test('a soaked footstep is duller than a dry one and caches apart from it', () => {
  for (const surface of ['grass', 'pavement', 'gravel']) {
    const dry = renderFootstep({ surface, strength: 0.5 }, 2)
    const damp = renderFootstep({ surface, strength: 0.5, damp: true }, 2)
    assert.ok(brightness(damp) < brightness(dry), `${surface} dulls when soaked`)
    assert.notEqual(footstepCue({ surface, strength: 0.5, damp: true }, 2).key, footstepCue({ surface, strength: 0.5 }, 2).key)
  }
  assert.equal(footstepCue({ surface: 'shallows', strength: 0.5, damp: true }, 2).key, footstepCue({ surface: 'shallows', strength: 0.5 }, 2).key)
})

test('a surface change is louder than step-to-step variation', () => {
  const level = (surface, seed) => rms(renderFootstep({ surface, strength: 0.5 }, seed)) * footstepCue({ surface, strength: 0.5 }, seed).gain
  const grassSpread = Math.abs(level('grass', 1) - level('grass', 2))
  assert.ok(Math.abs(level('pavement', 1) - level('grass', 1)) > grassSpread)
  assert.ok(brightness(renderFootstep({ surface: 'litter', strength: 0.5 }, 1)) > brightness(renderFootstep({ surface: 'grass', strength: 0.5 }, 1)) * 0.8)
})
