import type { Point } from '../world'
import type { SiteFeature } from '../site-props'

// Offset from the isolated subject's authored coordinates into the live island scene.
export interface FieldSite {
  name: string
  saltwindSubject?: string
  heading?: number
  offset: Point & { y: number }
  replaceBuilding?: number
  replaceFeature?: SiteFeature
  replaceFarm?: boolean
}
