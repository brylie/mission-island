import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAudioEngine } from '../src/audio/engine.ts'
import { voiceBudget } from '../src/audio/mix.ts'
import { crateCue } from '../src/audio/recipes.ts'
import { createSurfPlayer } from '../src/audio/surf-player.ts'
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
      stop() { ended.forEach((listener) => listener()) },
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

test('cues are dropped until a gesture unlocks playback, then play at once', async () => {
  const context = new FakeContext()
  const engine = createAudioEngine(() => context)
  assert.equal(engine.state(), 'locked')
  assert.equal(engine.play(cue), false)
  await engine.resumeFromGesture()
  assert.equal(engine.state(), 'running')
  assert.equal(engine.play(cue), true)
  assert.equal(context.started.length, 1)
})

test('a hidden tab stops its voices and drops new cues instead of queueing them', async () => {
  const context = new FakeContext()
  const engine = createAudioEngine(() => context)
  await engine.resumeFromGesture()
  engine.play(cue)
  const states = []
  engine.onState((state) => states.push(state))
  engine.setHidden(true)
  assert.equal(engine.state(), 'suspended')
  assert.equal(engine.voices(), 0)
  assert.equal(engine.play(cue), false)
  engine.setHidden(false)
  await Promise.resolve()
  assert.equal(engine.state(), 'running')
  assert.deepEqual(states, ['suspended', 'running'])
  assert.equal(context.started.length, 1, 'nothing dropped while hidden plays later')
})

test('effects voices stay within budget', async () => {
  const engine = createAudioEngine(() => new FakeContext())
  await engine.resumeFromGesture()
  for (let i = 0; i < voiceBudget.effects + 6; i++) engine.play(crateCue({ strength: 0.5, surface: 'bed' }, i))
  assert.equal(engine.voices('effects'), voiceBudget.effects)
})

test('surf restarts from the present after the tab returns, without a backlog of swells', async () => {
  const context = new FakeContext()
  const engine = createAudioEngine(() => context)
  const surf = createSurfPlayer(engine, 3)
  await engine.resumeFromGesture()
  const shore = coastPoint(5.3, 0.97)
  for (let frame = 0; frame < 600; frame++) {
    context.currentTime = frame / 60
    surf.frame(shore, { strength: 0.6, spacing: 1 }, 1 / 60)
  }
  const heard = context.started.length
  assert.ok(heard >= 3, 'every voice near the shore breaks within ten seconds')
  engine.setHidden(true)
  context.currentTime += 120
  engine.setHidden(false)
  await Promise.resolve()
  surf.frame(shore, { strength: 0.6, spacing: 1 }, 1 / 60)
  const resumed = context.started.slice(heard)
  assert.ok(resumed.length <= 1, 'at most one breaker starts on the first frame back')
  for (const { at } of resumed) assert.ok(at >= context.currentTime)
  surf.dispose()
})
