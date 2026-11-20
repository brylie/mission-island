import { Vector3 } from '@babylonjs/core/Maths/math.vector'

export type LightingPreset = 'daylight' | 'overcast' | 'golden'

export const lightingPresets = {
  daylight: { ambient: 0.58, sun: 0.86, color: '#fff3d7', direction: new Vector3(0.55, -1, 0.6) },
  overcast: { ambient: 0.92, sun: 0.22, color: '#dbeafa', direction: new Vector3(0.55, -1, 0.6) },
  golden: { ambient: 0.5, sun: 0.92, color: '#ffd6a5', direction: new Vector3(1, -0.46, 0.55) },
} as const
