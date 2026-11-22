import type { IslandSurfaceTarget } from '../island-world'
import type { SurfaceRecipe, SurfaceSettings } from '../assets/surface-recipes'
import type { Point } from '../world'
import type { SiteFeature } from '../worlds/site-feature'

// Offset from the isolated subject's authored coordinates into the live island scene.
export interface FieldSite {
  name: string
  saltwindSubject?: string
  surface?: {
    target: IslandSurfaceTarget
    recipe: SurfaceRecipe
    settings: SurfaceSettings
    radius: number
    alpha: number
    beta: number
  }
  heading?: number
  offset: Point & { y: number }
  replaceBuilding?: number
  replaceFeature?: SiteFeature
  replaceFarm?: boolean
  replaceFireWatch?: boolean
}
