import { windRecipe } from '../assets/audio/wind.ts'
import { fullTurnRadians } from '../math/angles.ts'
import { band, lowpass, normalize, seamlessNoise } from './dsp.ts'
import { half, variantRandom } from './recipe-kit.ts'
import type { Rendered } from './recipes.ts'

export type WindLayer = 'low' | 'high' | 'leaves' | 'needles'
export type WindTraits = { layer: WindLayer }

// A slow amplitude flutter made of whole cycles per loop, so it repeats without a seam.
function flutter(out: Float32Array, cycles: readonly number[], depth: number, random: () => number) {
  const phases = cycles.map(() => random() * fullTurnRadians)
  for (let i = 0; i < out.length; i++) {
    let wobble = 0
    for (const [k, count] of cycles.entries()) wobble += Math.sin(fullTurnRadians * count * i / out.length + phases[k])
    out[i] *= 1 - depth + depth * (wobble / cycles.length + 1) * half
  }
}

export function renderWind(traits: WindTraits, seed: number): Float32Array {
  const { sampleRate: rate, loopSeconds, loopFadeSeconds } = windRecipe
  const random = variantRandom(`wind-${traits.layer}`, seed, 0)
  const length = Math.round(loopSeconds * rate)
  const fade = Math.round(loopFadeSeconds * rate)
  if (traits.layer === 'low') {
    const { cutoffHz, secondCutoffHz } = windRecipe.low
    return normalize(seamlessNoise(length, random, (noise) => lowpass(lowpass(noise, cutoffHz, rate), secondCutoffHz, rate), fade))
  }
  if (traits.layer === 'high') return normalize(seamlessNoise(length, random, (noise) => band(noise, ...windRecipe.high.bandHz, rate), fade))
  const { bandHz, flutter: wobble } = windRecipe[traits.layer]
  const [low, high] = bandHz
  const canopy = seamlessNoise(length, random, (noise) => band(noise, low, high, rate), fade)
  flutter(canopy, wobble.cyclesPerLoop, wobble.depth, random)
  return normalize(canopy)
}

export function windCue(traits: WindTraits, seed: number): Rendered {
  return {
    key: `wind:${traits.layer}:${seed}`,
    job: { family: 'wind', traits: { layer: traits.layer }, seed },
    gain: 1,
    rate: windRecipe.sampleRate,
  }
}
