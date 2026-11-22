import { Vector3 } from '@babylonjs/core/Maths/math.vector'

import { studioLightingPresets } from '../assets/recipes/workbench-stage'

function studioLight(preset: typeof studioLightingPresets[keyof typeof studioLightingPresets]) {
  return { ...preset, direction: new Vector3(...preset.direction) }
}

export const lightingPresets = {
  daylight: studioLight(studioLightingPresets.daylight),
  overcast: studioLight(studioLightingPresets.overcast),
  grazing: studioLight(studioLightingPresets.grazing),
  dusk: studioLight(studioLightingPresets.dusk),
  golden: studioLight(studioLightingPresets.golden),
} as const

export type LightingPreset = keyof typeof lightingPresets
