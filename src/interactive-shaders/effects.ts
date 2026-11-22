import { demonstrationLampOffset } from '../assets/recipes/light-study-geometry'
import { lightBuilders } from './light'
import { surfaceBuilders } from './surfaces'
import { vegetationBuilders } from './vegetation'
import { waterBuilders } from './water'
import type { Builder, EffectFrame, Place } from './render'
import type { StudyId } from './catalog'

export const studyBuilders = { ...waterBuilders, ...vegetationBuilders, ...surfaceBuilders, ...lightBuilders } satisfies Record<StudyId, Builder>

export function demonstrationLamp(origin: Place): NonNullable<EffectFrame['lamp']> {
  const { x, y, z, heading } = demonstrationLampOffset
  return { x: origin.x + x, y: origin.y + y, z: origin.z + z, heading }
}
