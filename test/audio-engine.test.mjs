import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createAudioEngine } from '../src/audio/engine.ts'
import { voiceBudget } from '../src/audio/mix.ts'
import { inlineRenderer, workerRenderer } from '../src/audio/recipe-renderer.ts'
import { crateCue, swellCue } from '../src/audio/recipes.ts'
import { createSurfPlayer, swellSeed, swellVariants } from '../src/audio/surf-player.ts'
import { surfVoices } from '../src/audio/shore.ts'
import { coastPoint } from '../src/terrain.ts'

class Param {
  value = 0
  setTargetAtTime(value) { this.value = value }
  cancelScheduledValues() {}
}
class Node {
  connect() {}
  disconnect() {}
}
class Gain extends Node { gain = new Param() }
class Panner extends Node {
  positionX = new Param()
  positionY = new Param()
  positionZ = new Param()
}

// A minimal stand-in for an AudioContext that records what was started and when.
class FakeContext {
  state = 'suspended'
  currentTime = 0
  destination = new Node()
  listener = Object.fromEntries(['positionX', 'positionY', 'positionZ', 'forwardX', 'forwardY', 'forwardZ'].map((key) => [key, new Param()]))
  started = []
  createGain() { return new Gain() }
  createPanner() { return new Panner() }
  createBuffer(_channels, length, rate) { return { duration: length / rate, copyToChannel() {} } }
  createBufferSource() {
    const context = this
    const ended = []
    return Object.assign(new Node(), {
      buffer: null,
      addEventListener: (_type, listener) => ended.push(listener),
      start(at) { context.started.push({ at, duration: this.buffer.duration }) },
      stop() { ended.forEach((listener) => void listener()) },
    })
  }

  setState(state) {
    this.state = state
    this.onstatechange?.()
    return Promise.resolve()
  }

  resume() { return this.setState('running') }
  suspend() { return this.setState('suspended') }
  close() { return this.setState('closed') }
}

const cue = crateCue({ strength: 0.5, surface: 'ground' }, 1)
const settle = () => setImmediate()

// A renderer that holds each buffer until the test releases it, like a busy worker.
function heldRenderer() {
  const held = []
  return {
    held,
    renderer: () => ({
      render: (rendered) => new Promise((resolve) => {
        held.push(() => resolve(inlineRenderer().render(rendered)))
      }),
      dispose() {},
    }),
    release: async () => {
      held.splice(0).forEach((finish) => void finish())
      await settle()
    },
  }
}

const engineWith = (context, makeRenderer = inlineRenderer) => createAudioEngine(() => context, { makeRenderer })

test('cues are dropped until a gesture unlocks playback, then play once their buffer is ready', async () => {
  const context = new FakeContext()
  const engine = engineWith(context)
  assert.equal(engine.state(), 'locked')
  assert.equal(engine.play(cue), false)
  await engine.resumeFromGesture()
  assert.equal(engine.state(), 'running')
  assert.equal(engine.play(cue), true)
  await settle()
  assert.equal(context.started.length, 1)
  engine.play(cue)
  assert.equal(context.started.length, 2, 'a cached buffer starts in the same call')
})

test('a buffer that arrives too late, or after a stop, does not start an old cue', async () => {
  const context = new FakeContext()
  const slow = heldRenderer()
  const engine = engineWith(context, slow.renderer)
  await engine.resumeFromGesture()
  engine.play(cue)
  context.currentTime += 1
  await slow.release()
  assert.equal(context.started.length, 0, 'a cue more than its lateness behind is skipped')
  engine.play(crateCue({ strength: 0.5, surface: 'bed' }, 1))
  engine.stopAll()
  await slow.release()
  assert.equal(context.started.length, 0, 'a reset drops cues still waiting for buffers')
  engine.play(crateCue({ strength: 0.5, surface: 'bed' }, 2), { lateness: 2 })
  context.currentTime += 1
  await slow.release()
  assert.equal(context.started.length, 1, 'an audition may wait longer for its buffer')
})

test('warming renders ahead so later cues start without waiting', async () => {
  const context = new FakeContext()
  const engine = engineWith(context)
  await engine.resumeFromGesture()
  engine.warm([cue])
  await settle()
  engine.play(cue)
  assert.equal(context.started.length, 1)
})

test('without a worker, recipes render on the calling thread', async () => {
  const renderer = workerRenderer()
  const samples = await renderer.render(cue)
  assert.ok(samples.length > 0)
  renderer.dispose()
})

test('a hidden tab stops its voices and drops new cues instead of queueing them', async () => {
  const context = new FakeContext()
  const engine = engineWith(context)
  await engine.resumeFromGesture()
  engine.play(cue)
  await settle()
  const states = []
  engine.onState((state) => states.push(state))
  engine.setHidden(true)
  assert.equal(engine.state(), 'suspended')
  assert.equal(engine.voices(), 0)
  assert.equal(engine.play(cue), false)
  engine.setHidden(false)
  await settle()
  assert.equal(engine.state(), 'running')
  assert.deepEqual(states, ['suspended', 'running'])
  assert.equal(context.started.length, 1, 'nothing dropped while hidden plays later')
})

test('effects voices stay within budget', async () => {
  const engine = engineWith(new FakeContext())
  await engine.resumeFromGesture()
  for (let i = 0; i < voiceBudget.effects + 6; i++) engine.play(crateCue({ strength: 0.5, surface: 'bed' }, i))
  await settle()
  assert.equal(engine.voices('effects'), voiceBudget.effects)
})

test('surf restarts from the present after the tab returns, without a backlog of swells', async () => {
  const context = new FakeContext()
  const engine = engineWith(context)
  const surf = createSurfPlayer(engine, 3)
  await engine.resumeFromGesture()
  const settings = { strength: 0.6, spacing: 1 }
  engine.warm(Array.from({ length: surfVoices * swellVariants }, (_, i) => swellCue(settings, swellSeed(i % swellVariants, Math.floor(i / swellVariants)))))
  await settle()
  const shore = coastPoint(5.3, 0.97)
  for (let frame = 0; frame < 600; frame++) {
    context.currentTime = frame / 60
    surf.frame(shore, settings, 1 / 60)
  }
  const heard = context.started.length
  assert.ok(heard >= 3, 'every voice near the shore breaks within ten seconds')
  engine.setHidden(true)
  context.currentTime += 120
  engine.setHidden(false)
  await settle()
  surf.frame(shore, settings, 1 / 60)
  const resumed = context.started.slice(heard)
  assert.ok(resumed.length <= 1, 'at most one breaker starts on the first frame back')
  for (const { at } of resumed) assert.ok(at >= context.currentTime)
  surf.dispose()
})
