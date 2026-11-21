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

const tiers = 3
const tierOf = (value: number) => Math.min(tiers - 1, Math.max(0, Math.floor(clamp01(value) * tiers)))
const tierValue = (tier: number) => (tier + 0.5) / tiers

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

// Seeds pick related variants; the recipe name keeps the streams of each family apart.
function variantRandom(family: string, seed: number, tier: number, extra = 0) {
  let hash = Math.abs(Math.floor(seed)) * 2654435761 + tier * 97 + extra * 7919
  for (const char of family) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return seededRandom((hash >>> 0) || 1)
}

const jitter = (random: () => number, amount: number) => 1 + (random() * 2 - 1) * amount

export function renderCrate(traits: CrateTraits, seed: number): Float32Array {
  const strength = tierValue(tierOf(traits.strength))
  const bed = traits.surface === 'bed'
  const random = variantRandom(`crate-${traits.surface}`, seed, tierOf(traits.strength))
  const out = samples(bed ? 0.85 : 0.55)
  addThump(out, (bed ? 150 : 115) * jitter(random, 0.05), bed ? 74 : 58, bed ? 0.07 : 0.045, 1)
  const burst = shape(lowpass(whiteNoise(out.length, random), 600 + strength * 900), strike(0.002, 0.014))
  mixInto(out, burst, 0.7)
  // A hollow deck rings longer and lower than a crate landing on packed ground.
  const modes = bed ? [176, 284, 455, 731] : [214, 388, 612]
  for (const [i, frequency] of modes.entries()) {
    const decay = (bed ? 0.16 : 0.05) * jitter(random, 0.2) / (1 + i * 0.35)
    addMode(out, frequency * jitter(random, 0.06), decay, (0.32 + strength * 0.45) / (1 + i * 0.6), random() * 0.002)
  }
  // Harder impacts carry a brighter splintery tick.
  const tick = shape(band(whiteNoise(out.length, random), 2400, 7000), strike(0.0008, 0.004 + strength * 0.006))
  mixInto(out, tick, 0.08 + strength * 0.55)
  return finish(out)
}

export function crateCue(traits: CrateTraits, seed: number): Rendered {
  const strength = clamp01(traits.strength)
  return {
    key: `crate:${traits.surface}:${tierOf(strength)}:${seed}`,
    job: { family: 'crate', traits: { strength: traits.strength, surface: traits.surface }, seed },
    gain: 0.18 + strength * 0.82,
    rate: recipeRate,
  }
}

function gravelStep(out: Float32Array, random: () => number, strength: number) {
  mixInto(out, shape(lowpass(whiteNoise(out.length, random), 320), strike(0.004, 0.022)), 0.6)
  const ticks = 4 + Math.floor(random() * 3 + strength * 3)
  for (let i = 0; i < ticks; i++) {
    const at = Math.round((0.004 + random() * 0.07) * recipeRate)
    const grain = shape(band(whiteNoise(Math.round(0.012 * recipeRate), random), 1800 + random() * 1600, 6500), strike(0.0005, 0.0025))
    mixInto(out, grain, (0.25 + random() * 0.6) * (0.6 + strength * 0.5), at)
  }
}

function sandStep(out: Float32Array, random: () => number, strength: number) {
  const scrape = lowpass(whiteNoise(out.length, random), (t) => 950 + strength * 400 - t * 2600)
  mixInto(out, shape(scrape, strike(0.018, 0.06 + strength * 0.03)), 1)
  mixInto(out, shape(lowpass(whiteNoise(out.length, random), 180), strike(0.006, 0.03)), 0.5)
}

function boardStep(out: Float32Array, random: () => number, strength: number) {
  mixInto(out, shape(lowpass(whiteNoise(out.length, random), 700), strike(0.002, 0.012)), 0.55)
  addMode(out, 188 * jitter(random, 0.08), 0.06, 0.6 + strength * 0.2)
  addMode(out, 337 * jitter(random, 0.08), 0.035, 0.32 + strength * 0.2, 0.001)
  mixInto(out, shape(band(whiteNoise(out.length, random), 2200, 6000), strike(0.0006, 0.003)), 0.1 + strength * 0.2)
}

export function renderFootstep(traits: FootstepTraits, seed: number): Float32Array {
  const tier = tierOf(traits.strength)
  const strength = tierValue(tier)
  const random = variantRandom(`step-${traits.surface}`, seed, tier)
  const out = samples(traits.surface === 'boards' ? 0.26 : 0.2)
  if (traits.surface === 'gravel') gravelStep(out, random, strength)
  else if (traits.surface === 'sand') sandStep(out, random, strength)
  else if (traits.surface === 'boards') boardStep(out, random, strength)
  else mixInto(out, shape(lowpass(whiteNoise(out.length, random), 480), strike(0.005, 0.03)), 1)
  return finish(out)
}

const footstepLevel: Record<FootSurface, number> = { gravel: 0.55, sand: 0.42, boards: 0.6, fallback: 0.22 }

export function footstepCue(traits: FootstepTraits, seed: number): Rendered {
  const strength = clamp01(traits.strength)
  return {
    key: `step:${traits.surface}:${tierOf(strength)}:${seed}`,
    job: { family: 'step', traits: { surface: traits.surface, strength: traits.strength }, seed },
    gain: footstepLevel[traits.surface] * (0.55 + strength * 0.45),
    rate: recipeRate,
  }
}

// Surf holds only low, broadband noise, so it renders at half the rate of the sharper cues.
const surfRate = 12_000

export function swellSeconds(strength: number) {
  return 3.2 + tierValue(tierOf(strength)) * 1.4
}

// One breaker: a slow, dark swell for the incoming body and a brighter wash that darkens as it recedes.
export function renderSwell(traits: SurfTraits, seed: number): Float32Array {
  const tier = tierOf(traits.strength)
  const strength = tierValue(tier)
  const random = variantRandom('surf', seed, tier)
  const seconds = swellSeconds(traits.strength)
  const out = samples(seconds, surfRate)
  const crest = seconds * (0.34 + random() * 0.06)
  const body = lowpass(lowpass(whiteNoise(out.length, random), 300 + strength * 120, surfRate), 520, surfRate)
  mixInto(out, shape(body, (t) => t < crest ? Math.sin(t / crest * Math.PI / 2) ** 2 : Math.exp(-(t - crest) / (seconds * 0.32)), surfRate), 1.3)
  const washStart = crest * 0.9
  const brightness = 1900 + strength * 1900
  const wash = lowpass(band(whiteNoise(out.length, random), 260, 5500, surfRate), (t) => t < washStart ? brightness : Math.max(420, brightness * Math.exp(-(t - washStart) / (seconds * 0.25))), surfRate)
  const washLength = seconds * (0.38 + strength * 0.22)
  mixInto(out, shape(wash, (t) => {
    const local = t - washStart
    if (local < 0) return 0
    return local < 0.18 ? local / 0.18 : Math.max(0, 1 - (local - 0.18) / washLength) ** 1.6
  }, surfRate), 0.35 + strength * 0.5)
  return finish(out, surfRate, 0.05)
}

export function swellCue(traits: SurfTraits, seed: number): Rendered {
  const strength = clamp01(traits.strength)
  return {
    key: `surf:${tierOf(strength)}:${seed}`,
    job: { family: 'surf', traits: { strength: traits.strength }, seed },
    gain: 0.35 + strength * 0.65,
    rate: surfRate,
  }
}
