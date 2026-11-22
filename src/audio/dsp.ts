import { fullTurnRadians } from '../math/angles.ts'

const bipolarNoiseSpan = 2
const toneTailTimeConstants = 7
const chirpFrequencyDecayRatio = 0.6
const defaultEdgeFadeSeconds = 0.004
const defaultPeakLimit = 0.9
const fadeEnds = 2

// Small offline signal helpers for recipe buffers. Everything here is pure and deterministic.

// Recipes render at a modest rate: their content sits well below 12 kHz and buffers stay small.
// Plain indexed loops keep each buffer to a few milliseconds of main-thread work.
export const recipeRate = 24_000

export function samples(seconds: number, rate = recipeRate) {
  return new Float32Array(Math.max(1, Math.round(seconds * rate)))
}

export function whiteNoise(length: number, random: () => number) {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) out[i] = random() * bipolarNoiseSpan - 1
  return out
}

const coefficient = (cutoff: number, rate: number) => 1 - Math.exp(-fullTurnRadians * Math.max(1, cutoff) / rate)
// A moving cutoff is resampled every few samples; the sweep is far slower than that.
const sweepBlock = 16

// One-pole lowpass. The cutoff may change over the buffer to darken a tail.
export function lowpass(input: Float32Array, cutoff: number | ((t: number) => number), rate = recipeRate) {
  const out = new Float32Array(input.length)
  const moving = typeof cutoff === 'function'
  let a = moving ? 0 : coefficient(cutoff, rate)
  let y = 0
  for (let i = 0; i < input.length; i++) {
    if (moving && i % sweepBlock === 0) a = coefficient(cutoff(i / rate), rate)
    y += a * (input[i] - y)
    out[i] = y
  }
  return out
}

export function highpass(input: Float32Array, cutoff: number, rate = recipeRate) {
  const out = lowpass(input, cutoff, rate)
  for (let i = 0; i < out.length; i++) out[i] = input[i] - out[i]
  return out
}

// A band of noise between two one-pole corners.
export function band(input: Float32Array, low: number, high: number, rate = recipeRate) {
  return lowpass(highpass(input, low, rate), high, rate)
}

// Shape a signal with an envelope sampled in seconds.
export function shape(input: Float32Array, envelope: (t: number) => number, rate = recipeRate) {
  for (let i = 0; i < input.length; i++) input[i] *= envelope(i / rate)
  return input
}

// Attack-decay envelope with an exponential tail.
export const strike = (attack: number, decay: number, start = 0) => (t: number) => {
  const local = t - start
  if (local < 0) return 0
  return local < attack ? local / attack : Math.exp(-(local - attack) / decay)
}

// Add a damped sine mode, the core of a woody knock.
export function addMode(out: Float32Array, frequency: number, decay: number, amplitude: number, start = 0, rate = recipeRate) {
  const first = Math.max(0, Math.round(start * rate))
  const last = Math.min(out.length, first + Math.round(decay * toneTailTimeConstants * rate))
  for (let i = first; i < last; i++) {
    const t = (i - first) / rate
    out[i] += Math.sin(fullTurnRadians * frequency * t) * Math.exp(-t / decay) * amplitude
  }
}

// Add a falling-pitch sine, used for a body thump.
export function addThump(out: Float32Array, from: number, to: number, decay: number, amplitude: number, rate = recipeRate) {
  let phase = 0
  const last = Math.min(out.length, Math.round(decay * toneTailTimeConstants * rate))
  for (let i = 0; i < last; i++) {
    const t = i / rate
    phase += fullTurnRadians * (to + (from - to) * Math.exp(-t / (decay * chirpFrequencyDecayRatio))) / rate
    out[i] += Math.sin(phase) * Math.exp(-t / decay) * amplitude
  }
}

export function mixInto(out: Float32Array, input: Float32Array, gain = 1, offset = 0) {
  for (let i = 0; i < input.length && i + offset < out.length; i++) {
    if (i + offset >= 0) out[i + offset] += input[i] * gain
  }
  return out
}

// Fade the ends so a buffer never starts or stops with a click, then normalise its peak.
export function finish(out: Float32Array, rate = recipeRate, fadeSeconds = defaultEdgeFadeSeconds, peak = defaultPeakLimit) {
  const fade = Math.min(Math.floor(out.length / fadeEnds), Math.round(fadeSeconds * rate))
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade
    out[out.length - 1 - i] *= i / fade
  }
  return normalize(out, peak)
}

// Scale a buffer to a peak without touching its ends. Loops use it, since an edge fade would pulse at the seam.
export function normalize(out: Float32Array, peak = defaultPeakLimit) {
  let max = 0
  for (const value of out) max = Math.max(max, Math.abs(value))
  if (!Number.isFinite(max) || max === 0) return out.fill(0)
  const gain = peak / max
  for (let i = 0; i < out.length; i++) out[i] *= gain
  return out
}

// Filtered noise that loops without a seam: the stretch rendered past the end crossfades into the start,
// so the last sample flows into the first exactly as the filter would have continued. The blend is equal-power,
// because the two stretches are uncorrelated and a linear blend would dip in the middle.
export function seamlessNoise(length: number, random: () => number, filter: (input: Float32Array) => Float32Array, fadeLength: number) {
  const fade = Math.min(fadeLength, Math.floor(length / fadeEnds))
  const filtered = filter(whiteNoise(length + fade, random))
  const out = filtered.slice(0, length)
  for (let i = 0; i < fade; i++) {
    const blend = i / fade
    out[i] = filtered[i] * Math.sqrt(blend) + filtered[length + i] * Math.sqrt(1 - blend)
  }
  return out
}
