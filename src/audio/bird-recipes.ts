import { birdRecipe } from '../assets/audio/birds.ts'
import { fullTurnRadians } from '../math/angles.ts'
import { band, finish, mixInto, recipeRate, samples, shape, strike, whiteNoise } from './dsp.ts'
import { jitter, variantRandom } from './recipe-kit.ts'
import type { Rendered } from './recipes.ts'

export type BirdCall = 'kek' | 'mew' | 'flap' | 'song'
export type BirdTraits = { call: BirdCall }

type Range = readonly [number, number]
const between = (random: () => number, [low, high]: Range) => low + random() * (high - low)
const wholeBetween = (random: () => number, [low, high]: Range) => Math.floor(low + random() * (high - low + 1))

type Tone = {
  start: number
  seconds: number
  fromHz: number
  toHz: number
  harmonics: readonly number[]
  breath: number
  wobbleHz?: number
  wobbleDepth?: number
  pitchWobble?: boolean
}

// A voiced note gliding between two pitches, built from a few harmonics, with a breathy edge.
// A wobble either roughens its loudness (a gull's harshness) or bends its pitch (a vibrato).
function addTone(out: Float32Array, random: () => number, tone: Tone) {
  const first = Math.round(tone.start * recipeRate)
  const length = Math.min(out.length - first, Math.round(tone.seconds * recipeRate))
  const { attackSeconds, releaseSeconds } = birdRecipe
  let phase = 0
  for (let i = 0; i < length; i++) {
    const t = i / recipeRate
    const wobble = tone.wobbleHz ? Math.sin(fullTurnRadians * tone.wobbleHz * t) * (tone.wobbleDepth ?? 0) : 0
    const glide = tone.fromHz * (tone.toHz / tone.fromHz) ** (t / tone.seconds)
    phase += fullTurnRadians * glide * (tone.pitchWobble ? 1 + wobble : 1) / recipeRate
    let voice = 0
    for (const [k, weight] of tone.harmonics.entries()) voice += Math.sin(phase * (k + 1)) * weight
    const envelope = Math.min(1, t / attackSeconds, (tone.seconds - t) / releaseSeconds)
    out[first + i] += voice * envelope * (tone.pitchWobble ? 1 : 1 - Math.abs(wobble))
  }
  const breath = shape(band(whiteNoise(length, random), tone.fromHz, tone.fromHz * tone.harmonics.length), (t) => Math.min(1, t / attackSeconds, (tone.seconds - t) / releaseSeconds))
  mixInto(out, breath, tone.breath, first)
}

function kek(random: () => number) {
  const r = birdRecipe.kek
  const notes = wholeBetween(random, r.notes)
  const out = samples(notes * (r.noteSeconds + r.gapSeconds))
  const pitch = jitter(random, r.pitchJitter)
  for (let i = 0; i < notes; i++) {
    addTone(out, random, { start: i * (r.noteSeconds + r.gapSeconds), seconds: r.noteSeconds, fromHz: r.fromHz * pitch, toHz: r.toHz * pitch, harmonics: r.harmonics, breath: r.breath, wobbleHz: r.modulationHz, wobbleDepth: r.modulationDepth })
  }
  return out
}

function mew(random: () => number) {
  const r = birdRecipe.mew
  const out = samples(r.seconds)
  const pitch = jitter(random, r.pitchJitter)
  addTone(out, random, { start: 0, seconds: r.seconds, fromHz: r.fromHz * pitch, toHz: r.toHz * pitch, harmonics: r.harmonics, breath: r.breath, wobbleHz: r.vibratoHz, wobbleDepth: r.vibratoDepth, pitchWobble: true })
  return out
}

function flap(random: () => number) {
  const r = birdRecipe.flap
  const beats = wholeBetween(random, r.beats)
  const out = samples(beats * r.spacingSeconds + r.envelopeSeconds[1] * r.beats[1])
  for (let i = 0; i < beats; i++) {
    const beat = shape(band(whiteNoise(out.length, random), ...r.bandHz), strike(r.envelopeSeconds[0], r.envelopeSeconds[1], i * r.spacingSeconds))
    mixInto(out, beat, r.gain * (1 - i / beats))
  }
  return out
}

function song(random: () => number) {
  const r = birdRecipe.song
  const notes = wholeBetween(random, r.notes)
  const plan = Array.from({ length: notes }, () => ({ seconds: between(random, r.noteSeconds), gap: between(random, r.gapSeconds), from: between(random, [r.lowHz, r.highHz]), to: between(random, [r.lowHz, r.highHz]) }))
  const out = samples(plan.reduce((sum, note) => sum + note.seconds + note.gap, 0))
  let start = 0
  for (const note of plan) {
    addTone(out, random, { start, seconds: note.seconds, fromHz: note.from, toHz: note.to, harmonics: r.harmonics, breath: r.breath })
    start += note.seconds + note.gap
  }
  return out
}

const calls: Record<BirdCall, (random: () => number) => Float32Array> = { kek, mew, flap, song }

export function renderBird(traits: BirdTraits, seed: number): Float32Array {
  return finish(calls[traits.call](variantRandom(`bird-${traits.call}`, seed, 0)))
}

export function birdCue(traits: BirdTraits, seed: number): Rendered {
  return { key: `bird:${traits.call}:${seed}`, job: { family: 'bird', traits: { call: traits.call }, seed }, gain: 1, rate: recipeRate }
}
