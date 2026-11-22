import { shaderPresets } from './assets/recipes/island-shader-presets'

export { shaderPresets }
export { patchNoise } from './assets/effects/meadow-noise'

export type ShaderQuality = 'off' | 'low' | 'full'

export interface ShoreSettings {
  clarity: number
  foamReach: number
  quality: ShaderQuality
}

export interface MeadowSettings {
  gust: number
  grassDistance: number
  patchContrast: number
}

export const shoreDefaults: ShoreSettings = {
  ...shaderPresets.clearWater,
  ...shaderPresets.surfWash,
  quality: 'full',
}

export const meadowDefaults: MeadowSettings = {
  ...shaderPresets.seaBreeze,
  ...shaderPresets.rollingMeadow,
}
