import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createBirdCalls } from '../src/audio/bird-calls.ts'
import { birdCue, renderBird } from '../src/audio/bird-recipes.ts'
import { recipeRate } from '../src/audio/dsp.ts'
import { createAudioEngine } from '../src/audio/engine.ts'
import { inlineRenderer } from '../src/audio/recipe-renderer.ts'
import { starterGullPerches } from '../src/gull-sites.ts'
import { grove } from '../src/terrain.ts'
import { town } from '../src/world.ts'
import { FakeContext } from './support/fake-audio.mjs'

const noon = { hour: 12, rain: 0 }
const crossings = (buffer) => buffer.reduce((count, value, i) => i && Math.sign(value) !== Math.sign(buffer[i - 1]) ? count + 1 : count, 0)

test('each call has its own bounded, repeatable shape', () => {
  for (const call of ['kek', 'mew', 'flap', 'song']) {
    const sound = renderBird({ call }, 1)
    assert.deepEqual(renderBird({ call }, 1), sound)
    assert.ok(sound.length > 0 && sound.length < 1.5 * recipeRate)
    for (const value of sound) assert.ok(Number.isFinite(value) && Math.abs(value) <= 1)
    assert.notEqual(birdCue({ call }, 1).key, birdCue({ call }, 2).key)
  }
  const mew = renderBird({ call: 'mew' }, 1)
  const middle = Math.floor(mew.length / 2)
  assert.ok(crossings(mew.slice(0, middle)) > crossings(mew.slice(middle)), 'a mew falls in pitch')
})

// Run the birds for a while at a listening spot and collect when each call started.
async function listen(at, seconds, weather = noon, start = 1000) {
  const context = new FakeContext()
  const engine = createAudioEngine(() => context, { makeRenderer: inlineRenderer })
  const birds = createBirdCalls(engine)
  await engine.resumeFromGesture()
  for (let frame = 0; frame < seconds * 30; frame++) {
    context.currentTime = frame / 30
    birds.frame(at, start + frame / 30, weather)
    if (frame % 30 === 0) await setImmediate()
  }
  await setImmediate()
  return context.started.map(({ duration }) => duration)
}

test('the harbor gulls flap and call near the dock and are silent from far inland', async () => {
  const dock = starterGullPerches[0]
  const heard = await listen(dock, 120)
  assert.ok(heard.length >= 3, `${heard.length} gull sounds in two minutes at the dock`)
  assert.ok(heard.length < 120, 'calls come in ones and twos, not a stream')
  assert.equal((await listen({ x: 400, z: -400 }, 60)).length, 0)
})

test('songbirds sing in the woods by day and fall quiet at night and in heavy rain', async () => {
  assert.ok((await listen(grove, 90)).length > 0)
  assert.equal((await listen(grove, 90, { hour: 23, rain: 0 })).length, 0)
  assert.equal((await listen(grove, 90, { hour: 12, rain: 0.9 })).length, 0)
  assert.equal((await listen(town, 60, { hour: 23, rain: 0 })).length, 0)
})

test('both crewmates hear the same calls at the same moments', async () => {
  const first = await listen(grove, 60)
  const second = await listen(grove, 60)
  assert.deepEqual(second, first)
})
