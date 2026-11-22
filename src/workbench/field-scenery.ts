import { previewDriftwood } from './driftwood-preview'
import { createIslandWorld } from '../island-world'
import { createLandscape } from '../second-island/landscape'
import { createScenery } from '../second-island/scenery'
import { ScenerySolids } from '../second-island/walking'
import { createRecipeMaterial } from '../materials'
import type { MeshFactory } from '../island-meshes'
import type { WildlifeFrame } from '../wildlife'
import { marketRunoffPreview, dryMarketRainAge } from '../market-runoff'
import { secondsAtIslandHour } from '../residents/schedule'
import { draftFeatures } from './site-drafts'
import type { FieldSite } from './field-site'

export function createFieldScenery(meshes: MeshFactory, site: FieldSite) {
  if (site.saltwindSubject) {
    const solids = new ScenerySolids()
    const water = createLandscape(meshes, solids)
    const scenery = createScenery(meshes, solids, site.saltwindSubject)
    return {
      update(frame: WildlifeFrame, light: number) {
        scenery(frame, false)
        water(frame.time, light)
      },
    }
  }
  const school = previewDriftwood()
  const surface = site.surface
  const material = surface && createRecipeMaterial(meshes.scene, surface.recipe, surface.settings)
  const world = createIslandWorld(meshes, {
    ...site,
    features: draftFeatures(),
    surfaceStudy: surface && material && {
      target: surface.target,
      material,
      wear: surface.settings.wear ?? surface.recipe.wear.amount,
    },
  })
  return {
    surfaceMeshes: material ? meshes.scene.meshes.filter((mesh) => mesh.material === material) : undefined,
    update(frame: WildlifeFrame, light: number) {
      const runoff = marketRunoffPreview(frame.weather.rain, dryMarketRainAge)
      world.showHouseholds({ islandTime: secondsAtIslandHour(frame.weather.hour), gateRepair: { stage: 'sagging', pinHolder: null } })
      world.updateEnvironment(frame, light, true, runoff, { driftwood: school(frame.time) })
    },
  }
}
