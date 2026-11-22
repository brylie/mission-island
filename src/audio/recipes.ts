import { crateImpactRecipe } from '../assets/audio/crate-impact.ts'
import { footstepRecipe } from '../assets/audio/footsteps.ts'
import { surfRecipe } from '../assets/audio/surf.ts'
import { seededRandom } from '../seeded-random.ts'
import { addMode, addThump, band, finish, lowpass, mixInto, recipeRate, samples, shape, strike, whiteNoise } from './dsp.ts'

// Each recipe renders a peak-normalised shape. Loudness is applied at playback from the same traits,
// and the traits that also change timbre are quantised into tiers that form part of the cache key.

export type FootSurface = 'gravel' | 'sand' | 'boards' | 'fallback'
export type CrateSurface = 'ground' | 'bed'
type CrateTraits = { strength: number, surface: CrateSurface }
type FootstepTraits = { surface: FootSurface, strength: number }
type SurfTraits = { strength: number }

// A recipe job is plain data, so a worker can render it off the UI thread.
export type RecipeJob =
  | { family: 'crate', traits: CrateTraits, seed: number }
  | { family: 'step', traits: FootstepTraits, seed: number }
  | { family: 'surf', traits: SurfTraits, seed: number }

export type Rendered = { key: string, job: RecipeJob, gain: number, rate: number }

export function renderJob(job: RecipeJob): Float32Array {
  if (job.family === 'crate') return renderCrate(job.traits, job.seed)
  if (job.family === 'step') return renderFootstep(job.traits, job.seed)
  return renderSwell(job.traits, job.seed)
}

const strengthTiers = 3
const half = 0.5
const tierOf = (value: number) => Math.min(strengthTiers - 1, Math.max(0, Math.floor(clamp01(value) * strengthTiers)))
const tierValue = (tier: number) => (tier + half) / strengthTiers

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

// Seeds pick related variants; the recipe name keeps the streams of each family apart.
const seedHashMultiplier = 2_654_435_761
const tierHashMultiplier = 97
const familyHashMultiplier = 16_777_619
function variantRandom(family: string, seed: number, tier: number) {
  let hash = Math.abs(Math.floor(seed)) * seedHashMultiplier + tier * tierHashMultiplier
  for (const char of family) hash = Math.imul(hash ^ char.charCodeAt(0), familyHashMultiplier)
  return seededRandom((hash >>> 0) || 1)
}

const signedRandomRange = 2
const jitter = (random: () => number, amount: number) => 1 + (random() * signedRandomRange - 1) * amount

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

function gravelStep(out: Float32Array, random: () => number, strength: number) {
  const { body, grains } = footstepRecipe.gravel
  mixInto(out, shape(lowpass(whiteNoise(out.length, random), body.cutoffHz), strike(...body.envelopeSeconds)), body.gain)
  const ticks = grains.baseCount + Math.floor(random() * grains.countVariation + strength * grains.strengthCount)
  for (let i = 0; i < ticks; i++) {
    const at = Math.round((grains.startSeconds + random() * grains.startVariationSeconds) * recipeRate)
    const noise = whiteNoise(Math.round(grains.durationSeconds * recipeRate), random)
    const grain = shape(band(noise, grains.lowHz + random() * grains.lowVariationHz, grains.highHz), strike(...grains.envelopeSeconds))
    const gain = (grains.baseGain + random() * grains.gainVariation) * (grains.strengthBase + strength * grains.strengthGain)
    mixInto(out, grain, gain, at)
  }
}

function sandStep(out: Float32Array, random: () => number, strength: number) {
  const { scrape, body } = footstepRecipe.sand
  const friction = lowpass(whiteNoise(out.length, random), (t) => scrape.cutoffHz + strength * scrape.strengthCutoffHz - t * scrape.cutoffDropHzPerSecond)
  mixInto(out, shape(friction, strike(scrape.attackSeconds, scrape.decaySeconds + strength * scrape.strengthDecaySeconds)), 1)
  mixInto(out, shape(lowpass(whiteNoise(out.length, random), body.cutoffHz), strike(...body.envelopeSeconds)), body.gain)
}

function boardStep(out: Float32Array, random: () => number, strength: number) {
  const { body, modes, pitchJitter, modeStrengthGain, grain } = footstepRecipe.boards
  mixInto(out, shape(lowpass(whiteNoise(out.length, random), body.cutoffHz), strike(...body.envelopeSeconds)), body.gain)
  for (const mode of modes) {
    addMode(out, mode.frequencyHz * jitter(random, pitchJitter), mode.decaySeconds, mode.gain + strength * modeStrengthGain, mode.startSeconds)
  }
  mixInto(out, shape(band(whiteNoise(out.length, random), ...grain.bandHz), strike(...grain.envelopeSeconds)), grain.baseGain + strength * grain.strengthGain)
}

export function renderFootstep(traits: FootstepTraits, seed: number): Float32Array {
  const tier = tierOf(traits.strength)
  const strength = tierValue(tier)
  const random = variantRandom(`step-${traits.surface}`, seed, tier)
  const out = samples(traits.surface === 'boards' ? footstepRecipe.boards.durationSeconds : footstepRecipe.durationSeconds)
  if (traits.surface === 'gravel') gravelStep(out, random, strength)
  else if (traits.surface === 'sand') sandStep(out, random, strength)
  else if (traits.surface === 'boards') boardStep(out, random, strength)
  else {
    const { cutoffHz, envelopeSeconds } = footstepRecipe.fallback
    mixInto(out, shape(lowpass(whiteNoise(out.length, random), cutoffHz), strike(...envelopeSeconds)), 1)
  }
  return finish(out)
}

export function footstepCue(traits: FootstepTraits, seed: number): Rendered {
  const strength = clamp01(traits.strength)
  const { baseGain, strengthGain } = footstepRecipe.playback
  return {
    key: `step:${traits.surface}:${tierOf(strength)}:${seed}`,
    job: { family: 'step', traits: { surface: traits.surface, strength: traits.strength }, seed },
    gain: footstepRecipe[traits.surface].level * (baseGain + strength * strengthGain),
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
