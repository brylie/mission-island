import { fullTurnRadians } from '../math/angles.ts'
import { footstepRecipe } from '../assets/audio/footsteps.ts'
import { addMode, band, finish, lowpass, mixInto, recipeRate, samples, shape, strike, whiteNoise } from './dsp.ts'
import { clamp01, jitter, tierOf, tierValue, variantRandom } from './recipe-kit.ts'
import type { Rendered } from './recipes.ts'

export type FootSurface = 'gravel' | 'sand' | 'boards' | 'pavement' | 'grass' | 'litter' | 'shallows' | 'fallback'
// Damp ground dulls and squelches any surface, so it is a trait rather than a surface of its own.
export type FootstepTraits = { surface: FootSurface, strength: number, damp?: boolean }

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

function pavementStep(out: Float32Array, random: () => number, strength: number) {
  const { tap, knock, scuff } = footstepRecipe.pavement
  mixInto(out, shape(band(whiteNoise(out.length, random), ...tap.bandHz), strike(...tap.envelopeSeconds)), tap.gain + strength * tap.strengthGain)
  mixInto(out, shape(lowpass(whiteNoise(out.length, random), knock.cutoffHz), strike(...knock.envelopeSeconds)), knock.gain)
  const rub = shape(band(whiteNoise(out.length, random), ...scuff.bandHz), strike(scuff.envelopeSeconds[0], scuff.envelopeSeconds[1], scuff.startSeconds))
  mixInto(out, rub, scuff.gain + strength * scuff.strengthGain)
}

function grassStep(out: Float32Array, random: () => number, strength: number) {
  const { swish, body } = footstepRecipe.grass
  const [attack, decay] = swish.envelopeSeconds
  mixInto(out, shape(band(whiteNoise(out.length, random), ...swish.bandHz), strike(attack, decay + strength * swish.strengthDecaySeconds)), swish.gain)
  mixInto(out, shape(lowpass(whiteNoise(out.length, random), body.cutoffHz), strike(...body.envelopeSeconds)), body.gain)
}

function litterStep(out: Float32Array, random: () => number, strength: number) {
  const { hush, crackles } = footstepRecipe.litter
  mixInto(out, shape(band(whiteNoise(out.length, random), ...hush.bandHz), strike(...hush.envelopeSeconds)), hush.gain)
  const count = crackles.baseCount + Math.floor(random() * crackles.strengthCount * strength)
  for (let i = 0; i < count; i++) {
    const noise = whiteNoise(Math.round(crackles.durationSeconds * recipeRate), random)
    const crackle = shape(band(noise, crackles.lowHz + random() * crackles.lowVariationHz, crackles.highHz), strike(...crackles.envelopeSeconds))
    mixInto(out, crackle, crackles.baseGain + random() * crackles.gainVariation, Math.round(random() * crackles.spreadSeconds * recipeRate))
  }
}

function shallowsStep(out: Float32Array, random: () => number, strength: number) {
  const { splash, bubbles } = footstepRecipe.shallows
  const water = lowpass(whiteNoise(out.length, random), splash.cutoffHz + strength * splash.strengthCutoffHz)
  mixInto(out, shape(water, strike(...splash.envelopeSeconds)), splash.gain)
  for (let i = 0; i < bubbles.count; i++) {
    const pitch = jitter(random, bubbles.pitchJitter)
    addRisingBubble(out, bubbles.fromHz * pitch, bubbles.toHz * pitch, bubbles.decaySeconds, bubbles.gain, random() * bubbles.spreadSeconds)
  }
}

// A bubble is a short sine whose pitch rises as it collapses.
function addRisingBubble(out: Float32Array, from: number, to: number, decay: number, gain: number, start: number) {
  const first = Math.round(start * recipeRate)
  let phase = 0
  for (let i = first; i < out.length; i++) {
    const t = (i - first) / recipeRate
    const envelope = Math.exp(-t / decay)
    if (envelope < finishedLevel) break
    phase += fullTurnRadians * (to + (from - to) * envelope) / recipeRate
    out[i] += Math.sin(phase) * envelope * gain
  }
}
const finishedLevel = 0.001

// Soaked ground: keep part of the bright edge, then add a slow squelch after the footfall.
function soak(out: Float32Array, random: () => number) {
  const { keepBright, dullCutoffHz, squelch } = footstepRecipe.damp
  const dull = lowpass(out, dullCutoffHz)
  for (let i = 0; i < out.length; i++) out[i] = out[i] * keepBright + dull[i] * (1 - keepBright)
  const [attack, decay] = squelch.envelopeSeconds
  mixInto(out, shape(lowpass(whiteNoise(out.length, random), squelch.cutoffHz), strike(attack, decay, squelch.startSeconds)), squelch.gain)
}

const surfaceSteps: Record<Exclude<FootSurface, 'fallback'>, (out: Float32Array, random: () => number, strength: number) => void> = {
  gravel: gravelStep,
  sand: sandStep,
  boards: boardStep,
  pavement: pavementStep,
  grass: grassStep,
  litter: litterStep,
  shallows: shallowsStep,
}

function stepSeconds(surface: FootSurface) {
  if (surface === 'boards') return footstepRecipe.boards.durationSeconds
  if (surface === 'shallows') return footstepRecipe.shallows.durationSeconds
  return footstepRecipe.durationSeconds
}

export function renderFootstep(traits: FootstepTraits, seed: number): Float32Array {
  const tier = tierOf(traits.strength)
  const strength = tierValue(tier)
  const random = variantRandom(`step-${traits.surface}`, seed, tier)
  const out = samples(stepSeconds(traits.surface))
  if (traits.surface === 'fallback') {
    const { cutoffHz, envelopeSeconds } = footstepRecipe.fallback
    mixInto(out, shape(lowpass(whiteNoise(out.length, random), cutoffHz), strike(...envelopeSeconds)), 1)
  }
  else surfaceSteps[traits.surface](out, random, strength)
  if (traits.damp && traits.surface !== 'shallows') soak(out, random)
  return finish(out)
}

export function footstepCue(traits: FootstepTraits, seed: number): Rendered {
  const strength = clamp01(traits.strength)
  const damp = Boolean(traits.damp) && traits.surface !== 'shallows'
  const { baseGain, strengthGain } = footstepRecipe.playback
  return {
    key: `step:${traits.surface}:${damp ? 'damp' : 'dry'}:${tierOf(strength)}:${seed}`,
    job: { family: 'step', traits: { surface: traits.surface, strength: traits.strength, damp }, seed },
    gain: footstepRecipe[traits.surface].level * (baseGain + strength * strengthGain),
    rate: recipeRate,
  }
}
