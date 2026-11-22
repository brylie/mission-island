import { crateImpactRecipe } from '../assets/audio/crate-impact.ts'
import { surfRecipe } from '../assets/audio/surf.ts'
import { addMode, addThump, band, finish, lowpass, mixInto, recipeRate, samples, shape, strike, whiteNoise } from './dsp.ts'
import { renderFootstep, type FootstepTraits } from './footstep-recipes.ts'
import { renderMotor, type MotorTraits } from './motor-recipes.ts'
import { renderWind, type WindTraits } from './wind-recipes.ts'
import { renderFoliage, type FoliageTraits } from './foliage-recipes.ts'
import { renderBird, type BirdTraits } from './bird-recipes.ts'
import { clamp01, half, jitter, tierOf, tierValue, variantRandom } from './recipe-kit.ts'

export { footstepCue, renderFootstep, type FootSurface } from './footstep-recipes.ts'

// Each recipe renders a peak-normalised shape. Loudness is applied at playback from the same traits,
// and the traits that also change timbre are quantised into tiers that form part of the cache key.

export type CrateSurface = 'ground' | 'bed'
type CrateTraits = { strength: number, surface: CrateSurface }
type SurfTraits = { strength: number }

// A recipe job is plain data, so a worker can render it off the UI thread.
export type RecipeJob =
  | { family: 'crate', traits: CrateTraits, seed: number }
  | { family: 'step', traits: FootstepTraits, seed: number }
  | { family: 'surf', traits: SurfTraits, seed: number }
  | { family: 'motor', traits: MotorTraits, seed: number }
  | { family: 'wind', traits: WindTraits, seed: number }
  | { family: 'foliage', traits: FoliageTraits, seed: number }
  | { family: 'bird', traits: BirdTraits, seed: number }

export type Rendered = { key: string, job: RecipeJob, gain: number, rate: number }

export function renderJob(job: RecipeJob): Float32Array {
  if (job.family === 'crate') return renderCrate(job.traits, job.seed)
  if (job.family === 'step') return renderFootstep(job.traits, job.seed)
  if (job.family === 'motor') return renderMotor(job.traits, job.seed)
  if (job.family === 'wind') return renderWind(job.traits, job.seed)
  if (job.family === 'foliage') return renderFoliage(job.traits, job.seed)
  if (job.family === 'bird') return renderBird(job.traits, job.seed)
  return renderSwell(job.traits, job.seed)
}

export function renderCrate(traits: CrateTraits, seed: number): Float32Array {
  const tier = tierOf(traits.strength)
  const strength = tierValue(tier)
  const { durationSeconds, thump, resonance } = traits.surface === 'bed' ? crateImpactRecipe.bed : crateImpactRecipe.ground
  const { thumpPitchJitter, burst, wood, splinter } = crateImpactRecipe
  const random = variantRandom(`crate-${traits.surface}`, seed, tier)
  const out = samples(durationSeconds)
  addThump(out, thump.fromHz * jitter(random, thumpPitchJitter), thump.toHz, thump.decaySeconds, 1)
  const bodyNoise = lowpass(whiteNoise(out.length, random), burst.cutoffHz + strength * burst.strengthCutoffHz)
  mixInto(out, shape(bodyNoise, strike(...burst.envelopeSeconds)), burst.gain)

  for (const [i, frequency] of resonance.frequenciesHz.entries()) {
    const decay = resonance.decaySeconds * jitter(random, wood.decayJitter) / (1 + i * wood.decayFalloff)
    const gain = (wood.baseGain + strength * wood.strengthGain) / (1 + i * wood.gainFalloff)
    addMode(out, frequency * jitter(random, wood.pitchJitter), decay, gain, random() * wood.maxStartSeconds)
  }

  // Harder impacts carry a brighter splintery tick.
  const tick = band(whiteNoise(out.length, random), ...splinter.bandHz)
  mixInto(out, shape(tick, strike(splinter.attackSeconds, splinter.decaySeconds + strength * splinter.strengthDecaySeconds)), splinter.baseGain + strength * splinter.strengthGain)
  return finish(out)
}

export function crateCue(traits: CrateTraits, seed: number): Rendered {
  const strength = clamp01(traits.strength)
  const { baseGain, strengthGain } = crateImpactRecipe.playback
  return {
    key: `crate:${traits.surface}:${tierOf(strength)}:${seed}`,
    job: { family: 'crate', traits: { strength: traits.strength, surface: traits.surface }, seed },
    gain: baseGain + strength * strengthGain,
    rate: recipeRate,
  }
}

export function swellSeconds(strength: number) {
  return surfRecipe.durationSeconds + tierValue(tierOf(strength)) * surfRecipe.strengthDurationSeconds
}

// One breaker: a slow, dark swell for the incoming body and a brighter wash that darkens as it recedes.
export function renderSwell(traits: SurfTraits, seed: number): Float32Array {
  const { sampleRate, body, wash, crestPhase, crestVariation, edgeFadeSeconds } = surfRecipe
  const tier = tierOf(traits.strength)
  const strength = tierValue(tier)
  const random = variantRandom('surf', seed, tier)
  const seconds = swellSeconds(traits.strength)
  const out = samples(seconds, sampleRate)
  const crest = seconds * (crestPhase + random() * crestVariation)
  const bodyNoise = lowpass(whiteNoise(out.length, random), body.cutoffHz + strength * body.strengthCutoffHz, sampleRate)
  mixInto(out, shape(lowpass(bodyNoise, body.secondCutoffHz, sampleRate), (t) => {
    return t < crest
      ? Math.sin(t / crest * Math.PI * half) ** body.crestCurve
      : Math.exp(-(t - crest) / (seconds * body.decayFraction))
  }, sampleRate), body.gain)
  const washStart = crest * wash.startBeforeCrest
  const brightness = wash.cutoffHz + strength * wash.strengthCutoffHz
  const washNoise = band(whiteNoise(out.length, random), ...wash.bandHz, sampleRate)
  const sweep = lowpass(washNoise, (t) => {
    return t < washStart
      ? brightness
      : Math.max(wash.minimumCutoffHz, brightness * Math.exp(-(t - washStart) / (seconds * wash.brightnessDecayFraction)))
  }, sampleRate)
  const washLength = seconds * (wash.lengthFraction + strength * wash.strengthLengthFraction)
  mixInto(out, shape(sweep, (t) => {
    const local = t - washStart
    if (local < 0) return 0
    return local < wash.attackSeconds
      ? local / wash.attackSeconds
      : Math.max(0, 1 - (local - wash.attackSeconds) / washLength) ** wash.decayCurve
  }, sampleRate), wash.baseGain + strength * wash.strengthGain)
  return finish(out, sampleRate, edgeFadeSeconds)
}

export function swellCue(traits: SurfTraits, seed: number): Rendered {
  const strength = clamp01(traits.strength)
  const { playback, sampleRate } = surfRecipe
  return {
    key: `surf:${tierOf(strength)}:${seed}`,
    job: { family: 'surf', traits: { strength: traits.strength }, seed },
    gain: playback.baseGain + strength * playback.strengthGain,
    rate: sampleRate,
  }
}
