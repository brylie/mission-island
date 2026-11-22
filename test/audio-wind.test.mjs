import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { windMix, windRecipe } from '../src/assets/audio/wind.ts'
import { createAudioEngine } from '../src/audio/engine.ts'
import { inlineRenderer } from '../src/audio/recipe-renderer.ts'
import { createWindPlayer } from '../src/audio/wind-player.ts'
import { canopyGain, nearestCanopies, windExposure } from '../src/audio/wind-model.ts'
import { renderWind, windCue } from '../src/audio/wind-recipes.ts'
import { islandTrees } from '../src/scenery.ts'
import { coastPoint, grove, headland } from '../src/terrain.ts'
import { breezeAt, gustAt } from '../src/wind.ts'
import { town } from '../src/world.ts'
import { FakeContext } from './support/fake-audio.mjs'

test('the ridge and the shore are exposed, the woods are sheltered', () => {
  const ridge = windExposure(headland)
  const shore = windExposure(coastPoint(5.3, 0.97))
  const woods = windExposure(grove)
  const forestFloor = windExposure(islandTrees[5])
  assert.ok(ridge > windExposure(town), 'high ground is windier than the village')
  assert.ok(shore > forestFloor * 1.5, 'the beach is windier than the forest floor')
  for (const value of [ridge, shore, woods, forestFloor]) assert.ok(value >= 0 && value <= 1)
})

test('wind sound and windblown particles follow the same gust, flattened by rain', () => {
  const samples = Array.from({ length: 3000 }, (_, i) => gustAt(i * 0.1, 0))
  assert.ok(Math.max(...samples) > 0.8, 'gusts swell')
  assert.ok(Math.min(...samples) < 0.1, 'and the breeze falls still between windy spells')
  const lulls = Array.from({ length: 300 }, (_, i) => breezeAt(i))
  assert.ok(Math.min(...lulls) < 0.2 && Math.max(...lulls) > 0.9, 'over minutes the breeze comes and goes')
  for (let i = 1; i < lulls.length; i++) assert.ok(Math.abs(lulls[i] - lulls[i - 1]) < 0.15, 'without sudden changes')
  assert.ok(gustAt(2.5, 1) < gustAt(2.5, 0))
})

test('wind loops are seamless, repeatable and bounded', () => {
  for (const layer of ['low', 'high', 'leaves', 'needles']) {
    const loop = renderWind({ layer }, 1)
    assert.equal(loop.length, Math.round(windRecipe.loopSeconds * windRecipe.sampleRate))
    assert.deepEqual(renderWind({ layer }, 1), loop)
    for (const value of loop) assert.ok(Number.isFinite(value) && Math.abs(value) <= 1)
    const typicalStep = loop.reduce((sum, value, i) => i ? sum + Math.abs(value - loop[i - 1]) : sum, 0) / loop.length
    assert.ok(Math.abs(loop[0] - loop.at(-1)) < typicalStep * 6, `${layer} wraps without a click`)
  }
  assert.notEqual(windCue({ layer: 'leaves' }, 1).key, windCue({ layer: 'needles' }, 1).key)
})

test('crowns are heard close by and fade smoothly at the edge of earshot', () => {
  assert.equal(canopyGain(0), 1)
  assert.equal(canopyGain(windMix.canopy.reachMetres + 1), 0)
  for (let d = 0; d < windMix.canopy.reachMetres; d += 0.5) assert.ok(canopyGain(d + 0.5) <= canopyGain(d))
  const near = nearestCanopies(islandTrees[5], 3)
  assert.ok(near.length > 0 && near.length <= 3)
  assert.ok(near.some((tree) => tree.leafy) || near.some((tree) => !tree.leafy))
})

test('walking through the woods moves canopy voices only while they are silent', async () => {
  const context = new FakeContext()
  const engine = createAudioEngine(() => context, { makeRenderer: inlineRenderer })
  const wind = createWindPlayer(engine)
  await engine.resumeFromGesture()
  const start = islandTrees[5]
  wind.frame(start, 0, 0, 1 / 60)
  await setImmediate()
  for (let frame = 0; frame < 900; frame++) wind.frame({ x: start.x + frame * 0.05, z: start.z }, frame / 60, 0, 1 / 60)
  const loops = context.started.filter((entry) => entry.loop)
  assert.ok(loops.length >= 3, 'open wind and at least one crown are playing')
  assert.ok(loops.length < 12, 'voices are reused, not restarted on every retarget')
  wind.dispose()
})
