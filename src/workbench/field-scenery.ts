import { previewDriftwood } from './driftwood-preview'
import { createIslandWorld } from '../island-world'
import { createLandscape } from '../second-island/landscape'
import { createScenery } from '../second-island/scenery'
import { ScenerySolids } from '../second-island/walking'
import type { MeshFactory } from '../island-meshes'
import type { WildlifeFrame } from '../wildlife'
import { marketRunoffPreview, dryMarketRainAge } from '../market-runoff'
import { draftFeatures } from './site-drafts'
import type { FieldSite } from './field-site'

export function createFieldScenery(meshes: MeshFactory, site: FieldSite) {
  if (site.saltwindSubject) {
    const solids = new ScenerySolids()
    const water = createLandscape(meshes, solids)
    const scenery = createScenery(meshes, solids, site.saltwindSubject)
    return (frame: WildlifeFrame, light: number) => {
      scenery(frame, false)
      water(frame.time, light)
    }
  }
  const school = previewDriftwood()
  const world = createIslandWorld(meshes, { ...site, features: draftFeatures() })
  return (frame: WildlifeFrame, light: number) => {
    const runoff = marketRunoffPreview(frame.weather.rain, dryMarketRainAge)
    world.updateEnvironment(frame, light, true, runoff, { driftwood: school(frame.time) })
  }
}
