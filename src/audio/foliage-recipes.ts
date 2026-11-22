import { foliageContact, foliageRecipe } from '../assets/audio/foliage.ts'
import { addMode, band, finish, mixInto, recipeRate, samples, shape, strike, whiteNoise } from './dsp.ts'
import { clamp01, jitter, tierOf, tierValue, variantRandom } from './recipe-kit.ts'
import type { Rendered } from './recipes.ts'

export type FoliageKind = 'fern' | 'rushes' | 'marram' | 'trunk'
export type FoliageTraits = { kind: FoliageKind, strength: number }

function rustle(out: Float32Array, kind: Exclude<FoliageKind, 'trunk'>, random: () => number, strength: number) {
  const recipe = foliageRecipe[kind]
  const [low, high] = recipe.bandHz
  for (let i = 0; i < recipe.bursts; i++) {
    const start = i === 0 ? 0 : random() * recipe.burstSpreadSeconds
    const leaves = shape(band(whiteNoise(out.length, random), low, high), strike(recipe.attackSeconds, recipe.decaySeconds + strength * recipe.strengthDecaySeconds, start))
    mixInto(out, leaves, 1 - random() * foliageRecipe.burstGainVariation)
  }
  if ('stems' in recipe) {
    const { stems } = recipe
    for (let i = 0; i < stems.count; i++) {
      const click = shape(band(whiteNoise(out.length, random), ...stems.bandHz), strike(stems.envelopeSeconds[0], stems.envelopeSeconds[1], random() * stems.spreadSeconds))
      mixInto(out, click, stems.gain)
    }
  }
}

function bark(out: Float32Array, random: () => number) {
  const { scrape, tick } = foliageRecipe.trunk
  mixInto(out, shape(band(whiteNoise(out.length, random), ...scrape.bandHz), strike(...scrape.envelopeSeconds)), scrape.gain)
  addMode(out, tick.frequencyHz * jitter(random, tick.pitchJitter), tick.decaySeconds, tick.gain, tick.startSeconds)
}

export function renderFoliage(traits: FoliageTraits, seed: number): Float32Array {
  const tier = tierOf(traits.strength)
  const random = variantRandom(`foliage-${traits.kind}`, seed, tier)
  const out = samples(foliageRecipe.durationSeconds)
  if (traits.kind === 'trunk') bark(out, random)
  else rustle(out, traits.kind, random, tierValue(tier))
  return finish(out)
}

export function foliageCue(traits: FoliageTraits, seed: number): Rendered {
  const strength = clamp01(traits.strength)
  const level = traits.kind === 'trunk' ? foliageContact.trunk.level : foliageContact.plants[traits.kind].level
  const { baseGain, strengthGain } = foliageRecipe.playback
  return {
    key: `foliage:${traits.kind}:${tierOf(strength)}:${seed}`,
    job: { family: 'foliage', traits: { kind: traits.kind, strength: traits.strength }, seed },
    gain: level * (baseGain + strength * strengthGain),
    rate: recipeRate,
  }
}
