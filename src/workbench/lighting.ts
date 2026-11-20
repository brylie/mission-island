import { Vector3 } from '@babylonjs/core/Maths/math.vector'

export const lightingPresets = {
  daylight: { ambient: 0.58, sun: 0.86, color: '#fff3d7', direction: new Vector3(0.55, -1, 0.6) },
  overcast: { ambient: 0.92, sun: 0.22, color: '#dbeafa', direction: new Vector3(0.55, -1, 0.6) },
  grazing: { ambient: 0.48, sun: 1.1, color: '#fff0d6', direction: new Vector3(1, -0.17, 0.35) },
  dusk: { ambient: 0.06, sun: 0.05, color: '#a9bddb', direction: new Vector3(1, -0.17, 0.35) },
  golden: { ambient: 0.5, sun: 0.92, color: '#ffd6a5', direction: new Vector3(1, -0.46, 0.55) },
} as const

export type LightingPreset = keyof typeof lightingPresets
