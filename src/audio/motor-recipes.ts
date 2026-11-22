import { flatbedEngineRecipe } from '../assets/audio/flatbed-engine.ts'
import { fullTurnRadians } from '../math/angles.ts'
import { band, lowpass, normalize, seamlessNoise, whiteNoise } from './dsp.ts'
import { tierOf, tierValue, variantRandom } from './recipe-kit.ts'
import type { Rendered } from './recipes.ts'

export type MotorLayer = 'idle' | 'load'
export type MotorTraits = { layer: MotorLayer, roughness: number }

// A damped event lasts about this many time constants before it is inaudible.
const eventTimeConstants = 7
const signedRange = 2

// Adds an event that may run past the end of the loop; the overflow wraps to the start, so the loop has no seam.
function addWrapped(out: Float32Array, start: number, event: Float32Array, gain: number) {
  const first = Math.round(start)
  for (let i = 0; i < event.length; i++) {
    const index = ((first + i) % out.length + out.length) % out.length
    out[index] += event[i] * gain
  }
}

function dampedSine(frequency: number, decay: number, rate: number) {
  const event = new Float32Array(Math.round(decay * eventTimeConstants * rate))
  for (let i = 0; i < event.length; i++) {
    const t = i / rate
    event[i] = Math.sin(fullTurnRadians * frequency * t) * Math.exp(-t / decay)
  }
  return event
}

function noiseBurst(random: () => number, cutoff: number, decay: number, rate: number) {
  const event = lowpass(whiteNoise(Math.round(decay * eventTimeConstants * rate), random), cutoff, rate)
  for (let i = 0; i < event.length; i++) event[i] *= Math.exp(-i / rate / decay)
  return event
}

// One seamless loop of the engine: evenly spaced firings with a little wander, over an exhaust rumble.
export function renderMotor(traits: MotorTraits, seed: number): Float32Array {
  const { sampleRate: rate, loopSeconds, firingHz, loopFadeSeconds, roughness } = flatbedEngineRecipe
  const layer = flatbedEngineRecipe[traits.layer]
  const tier = tierOf(traits.roughness)
  const rough = tierValue(tier)
  const random = variantRandom(`motor-${traits.layer}`, seed, tier)
  const out = new Float32Array(Math.round(loopSeconds * rate))
  const firings = Math.round(firingHz * loopSeconds)
  const period = out.length / firings
  const body = dampedSine(layer.pulse.bodyHz, layer.pulse.decaySeconds, rate)
  for (let k = 0; k < firings; k++) {
    const wander = (random() * signedRange - 1) * rough
    const start = k * period + wander * roughness.timingFraction * period
    const strength = 1 + (random() * signedRange - 1) * rough * roughness.strength
    addWrapped(out, start, body, layer.pulse.gain * strength)
    addWrapped(out, start, noiseBurst(random, layer.knock.cutoffHz, layer.knock.decaySeconds, rate), layer.knock.gain * strength)
  }
  const fade = Math.round(loopFadeSeconds * rate)
  const rumble = seamlessNoise(out.length, random, (noise) => lowpass(noise, layer.rumble.cutoffHz, rate), fade)
  for (let i = 0; i < out.length; i++) out[i] += rumble[i] * layer.rumble.gain
  if ('rasp' in layer) {
    const rasp = seamlessNoise(out.length, random, (noise) => band(noise, ...layer.rasp.bandHz, rate), fade)
    for (let i = 0; i < out.length; i++) out[i] += rasp[i] * layer.rasp.gain
  }
  return normalize(out)
}

export function motorCue(traits: MotorTraits, seed: number): Rendered {
  return {
    key: `motor:${traits.layer}:${tierOf(traits.roughness)}:${seed}`,
    job: { family: 'motor', traits: { layer: traits.layer, roughness: traits.roughness }, seed },
    gain: 1,
    rate: flatbedEngineRecipe.sampleRate,
  }
}
