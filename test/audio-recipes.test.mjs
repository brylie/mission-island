import assert from 'node:assert/strict'
import { test } from 'node:test'
import { highpass, recipeRate } from '../src/audio/dsp.ts'
import { createImpactInbox } from '../src/audio/impact-inbox.ts'
import { busGains, defaultSound } from '../src/audio/mix.ts'
import { crateCue, footstepCue, renderCrate, renderFootstep, renderSwell, swellCue, swellSeconds } from '../src/audio/recipes.ts'

const rms = (buffer) => Math.sqrt(buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length)
// Share of energy above 2 kHz, a stand-in for brightness.
const brightness = (buffer) => rms(highpass(buffer, 2000)) / rms(buffer)

function assertBounded(buffer, maxSeconds) {
  assert.ok(buffer.length > 0 && buffer.length <= maxSeconds * recipeRate)
  for (const value of buffer) assert.ok(Number.isFinite(value) && Math.abs(value) <= 1)
}

test('recipes are deterministic per seed, vary across seeds and stay bounded', () => {
  const renders = [
    (seed) => renderCrate({ strength: 0.6, surface: 'ground' }, seed),
    (seed) => renderCrate({ strength: 0.6, surface: 'bed' }, seed),
    ...['gravel', 'sand', 'boards', 'fallback'].map((surface) => (seed) => renderFootstep({ surface, strength: 0.5 }, seed)),
    (seed) => renderSwell({ strength: 0.5 }, seed),
  ]
  for (const render of renders) {
    const first = render(3)
    assert.deepEqual(render(3), first)
    assert.notDeepEqual(render(4), first)
    assertBounded(first, 5)
  }
})

test('a harder crate landing is louder and brighter, and the bed rings longer than the ground', () => {
  const soft = crateCue({ strength: 0.1, surface: 'ground' }, 1)
  const hard = crateCue({ strength: 0.95, surface: 'ground' }, 1)
  assert.ok(hard.gain * rms(hard.render()) > soft.gain * rms(soft.render()) * 1.5)
  assert.ok(brightness(hard.render()) > brightness(soft.render()))
  assert.ok(renderCrate({ strength: 0.5, surface: 'bed' }, 1).length > renderCrate({ strength: 0.5, surface: 'ground' }, 1).length)
})

test('cache keys change with the seed and every trait that reshapes the waveform', () => {
  const base = crateCue({ strength: 0.5, surface: 'ground' }, 1).key
  assert.notEqual(crateCue({ strength: 0.5, surface: 'ground' }, 2).key, base)
  assert.notEqual(crateCue({ strength: 0.5, surface: 'bed' }, 1).key, base)
  assert.notEqual(crateCue({ strength: 0.95, surface: 'ground' }, 1).key, base)
  assert.notEqual(footstepCue({ surface: 'sand', strength: 0.5 }, 1).key, footstepCue({ surface: 'gravel', strength: 0.5 }, 1).key)
  assert.notEqual(swellCue({ strength: 0.1 }, 1).key, swellCue({ strength: 0.9 }, 1).key)
})

test('stronger surf is louder and longer, and firmer steps are louder', () => {
  assert.ok(swellSeconds(0.9) > swellSeconds(0.1))
  assert.ok(swellCue({ strength: 0.9 }, 1).gain > swellCue({ strength: 0.1 }, 1).gain)
  assert.ok(footstepCue({ surface: 'boards', strength: 1 }, 1).gain > footstepCue({ surface: 'boards', strength: 0 }, 1).gain)
  assert.ok(footstepCue({ surface: 'fallback', strength: 1 }, 1).gain < footstepCue({ surface: 'gravel', strength: 1 }, 1).gain)
})

test('mute silences the mix and levels follow a loudness curve', () => {
  assert.equal(busGains({ ...defaultSound, muted: true }).master, 0)
  const half = busGains({ ambience: 0.5, effects: 1, muted: false })
  assert.equal(half.ambience, 0.25)
  assert.equal(half.effects, 1)
  assert.equal(busGains({ ambience: Number.NaN, effects: 4, muted: false }).ambience, 0)
})

test('the impact inbox plays each cue once and never a backlog', () => {
  let now = 1000
  const inbox = createImpactInbox(() => now, 4)
  assert.equal(inbox.accept('a:1', true), true)
  assert.equal(inbox.accept('a:1', true), false, 'a repeated id is ignored')
  assert.equal(inbox.accept('a:2', false), false, 'a cue that arrives while suspended is dropped')
  assert.equal(inbox.accept('a:2', true), false, 'and is not played later')
  inbox.reset()
  assert.equal(inbox.accept('a:3', true), false, 'cues right after a reset belong to the previous run')
  now += 400
  assert.equal(inbox.accept('a:4', true), true)
  for (let i = 5; i < 12; i++) inbox.accept(`a:${i}`, true)
  assert.equal(inbox.accept('a:1', true), true, 'the seen list is bounded')
})
