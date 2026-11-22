import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { flatbedEngineRecipe } from '../src/assets/audio/flatbed-engine.ts'
import { createAudioEngine } from '../src/audio/engine.ts'
import { motorCue, renderMotor } from '../src/audio/motor-recipes.ts'
import { inlineRenderer } from '../src/audio/recipe-renderer.ts'
import { createTruckEngine } from '../src/audio/truck-engine.ts'
import { engineEffort, engineInputs, engineTarget } from '../src/audio/truck-engine-model.ts'
import { FakeContext } from './support/fake-audio.mjs'

const idle = { running: true, speed: 0, acceleration: 0, braking: false, pitch: 0, crates: 0 }

test('engine loops are seamless, repeatable and bounded', () => {
  for (const layer of ['idle', 'load']) {
    const loop = renderMotor({ layer, roughness: 0.5 }, 1)
    assert.deepEqual(renderMotor({ layer, roughness: 0.5 }, 1), loop)
    assert.notDeepEqual(renderMotor({ layer, roughness: 0.5 }, 2), loop)
    assert.equal(loop.length, Math.round(flatbedEngineRecipe.loopSeconds * flatbedEngineRecipe.sampleRate))
    for (const value of loop) assert.ok(Number.isFinite(value) && Math.abs(value) <= 1)
    const typicalStep = loop.reduce((sum, value, i) => i ? sum + Math.abs(value - loop[i - 1]) : sum, 0) / loop.length
    assert.ok(Math.abs(loop[0] - loop.at(-1)) < typicalStep * 6, `${layer} wraps without a click`)
  }
  assert.notEqual(motorCue({ layer: 'idle', roughness: 0.1 }, 1).key, motorCue({ layer: 'idle', roughness: 0.9 }, 1).key)
})

test('effort comes from pulling away, climbing and hauling, never from braking', () => {
  assert.equal(engineEffort(idle), 0)
  assert.ok(engineEffort({ ...idle, speed: 3, acceleration: 2 }) > 0.5)
  assert.equal(engineEffort({ ...idle, speed: 3, acceleration: 2, braking: true }), 0)
  assert.ok(engineEffort({ ...idle, speed: 5, pitch: -0.1 }) > 0.5, 'nose-up while driving forward is a climb')
  assert.equal(engineEffort({ ...idle, speed: 5, pitch: 0.1 }), 0, 'rolling downhill takes no effort')
  assert.ok(engineEffort({ ...idle, speed: -2, pitch: 0.1 }) > 0, 'reversing up a slope is a climb too')
  const empty = engineEffort({ ...idle, speed: 3, acceleration: 1 })
  assert.ok(engineEffort({ ...idle, speed: 3, acceleration: 1, crates: 3 }) > empty, 'a loaded bed works harder')
  assert.equal(engineEffort({ ...idle, crates: 3 }), 0, 'a loaded truck standing still just idles')
})

test('a straining engine sounds unlike plain speed', () => {
  const cruising = engineTarget({ ...idle, speed: 8 }, 0)
  const straining = engineTarget({ ...idle, speed: 8 }, 1)
  assert.ok(engineTarget({ ...idle, speed: 12 }, 0).rate > cruising.rate)
  assert.ok(straining.rate > cruising.rate, 'effort lifts the pitch a little')
  assert.ok(straining.loadLevel > cruising.loadLevel * 2, 'and brings in the working layer')
  assert.ok(straining.idleLevel < cruising.idleLevel)
  assert.deepEqual(engineTarget({ ...idle, running: false }, 0).idleLevel, 0)
})

test('only a driver keeps the engine running', () => {
  const state = (seat) => ({
    truck: { speed: 0, braking: false, pitch: 0 },
    players: [{ connected: true, seat }],
    items: [{ kind: 'crate', onBed: true, delivered: false }, { kind: 'crate', onBed: false, delivered: false }],
  })
  assert.equal(engineInputs(state('driver'), 0).running, true)
  assert.equal(engineInputs(state('passenger'), 0).running, false)
  assert.equal(engineInputs(state('driver'), 0).crates, 1)
})

test('the engine starts with a driver, follows the truck and fades out after they leave', async () => {
  const context = new FakeContext()
  const engine = createAudioEngine(() => context, { makeRenderer: inlineRenderer })
  const truck = createTruckEngine(engine)
  await engine.resumeFromGesture()
  const at = { x: 1, y: 1, z: 1 }
  truck.frame(idle, at, 1 / 60)
  await setImmediate()
  truck.frame(idle, at, 1 / 60)
  const loops = context.started.filter((entry) => entry.loop)
  assert.equal(loops.length, 2, 'idle and working layers both start')
  for (let frame = 0; frame < 60; frame++) truck.frame({ ...idle, speed: 10 }, at, 1 / 60)
  assert.ok(loops[0].source.playbackRate.value > 2, 'pitch rises with road speed')
  for (let frame = 0; frame < 200; frame++) truck.frame({ ...idle, running: false }, at, 1 / 60)
  const startedAgain = context.started.filter((entry) => entry.loop).length
  assert.equal(startedAgain, 2, 'no new loops while the cab is empty')
  truck.frame(idle, at, 1 / 60)
  assert.equal(context.started.filter((entry) => entry.loop).length, 4, 'a returning driver restarts the engine')
  truck.dispose()
})
