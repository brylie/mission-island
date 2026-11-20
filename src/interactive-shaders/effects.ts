import { lightBuilders } from './light'
import { surfaceBuilders } from './surfaces'
import { vegetationBuilders } from './vegetation'
import { waterBuilders } from './water'
import type { Builder, EffectFrame, Place } from './render'
import type { StudyId } from './catalog'
import type { Pose } from '../world'

export const studyBuilders = { ...waterBuilders, ...vegetationBuilders, ...surfaceBuilders, ...lightBuilders } satisfies Record<StudyId, Builder>

export function demonstrationLamp(origin: Place): NonNullable<EffectFrame['lamp']> {
  return { x: origin.x - 5.3, y: origin.y + .93, z: origin.z - 2.2, heading: 1.20 }
}

export function boatInStudy(origin: Place): Pose {
  return { x: origin.x - .25, z: origin.z + 4.7, heading: .03 }
}
