// Low sun reaches the island through more air, so blue scatters away and the
// direct light deepens from gold to ember. The sky that fills the shadows stays
// blue, so the warm key and the cool fill separate as the sun sets.
// The curves' values live in the golden hour recipe.

import { goldenHourPreset, type Rgb } from './assets/recipes/golden-hour.ts'

export { goldenHourPreset }

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

interface GoldenHourLight {
  // 0 with a high sun or at night, 1 at the warmest moment near the horizon.
  amount: number
  sun: Rgb
  fill: Rgb
  fillScale: number
  sunScale: number
  hazeAmount: number
}

export function goldenHourLight(sunElevation: number, rain: number, preset = goldenHourPreset): GoldenHourLight {
  const low = clamp01((preset.startElevation - sunElevation) / preset.startElevation)
  const aboveHorizon = clamp01((sunElevation + preset.fadeBelowHorizon) / preset.fadeBelowHorizon)
  // Overcast skies scatter the low sun before it reaches the ground.
  const amount = low * aboveHorizon * clamp01(1 - rain)
  const g = preset.goldShare
  const sun = low < g ? mix(preset.noonSun, preset.goldSun, low / g) : mix(preset.goldSun, preset.emberSun, (low - g) / (1 - g))
  return {
    amount,
    // The sun's hue follows elevation alone; rain mutes it back toward neutral.
    sun: mix(preset.noonSun, sun, aboveHorizon * clamp01(1 - rain)),
    fill: mix(preset.noonFill, preset.coolFill, amount),
    fillScale: 1 - preset.fillDimming * amount,
    sunScale: 1 + preset.sunBoost * amount,
    hazeAmount: preset.hazeStrength * amount,
  }
}
