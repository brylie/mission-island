import { lightBuilders } from './light'
import { surfaceBuilders } from './surfaces'
import { vegetationBuilders } from './vegetation'
import { waterBuilders } from './water'
import type { Builder, EffectFrame, Place } from './render'
import type { StudyId } from './catalog'

export const studyBuilders = { ...waterBuilders, ...vegetationBuilders, ...surfaceBuilders, ...lightBuilders } satisfies Record<StudyId, Builder>

export function demonstrationLamp(origin: Place): NonNullable<EffectFrame['lamp']> {
  return { x: origin.x - 5.3, y: origin.y + 0.93, z: origin.z - 2.2, heading: 1.20 }
}
