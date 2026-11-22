import { landscapeFurnishingControls } from '../assets/recipes/workbench-place-studies'
import { starterFeatures } from '../worlds/starter/sites'
import { createSiteFeature, poseSiteFeature } from '../assets/site-props'
import { walkingHeight } from '../terrain'
import type { Point } from '../world'
import { defaultPlacement, editedFeature } from './site-drafts'
import { range, type Entry } from './subject'

export const furnishingStudies = starterFeatures.map((feature): Entry => ({
  id: 'site-' + feature.site,
  name: feature.name,
  group: 'Site furnishings',
  source: 'src/worlds/starter/sites.ts',
  description: 'Adjust the placement and finish, then check clearances on the island.',
  controls: [
    range('east', 'East offset (m)', 0, ...landscapeFurnishingControls.offset),
    range('north', 'North offset (m)', 0, ...landscapeFurnishingControls.offset),
    range('heading', 'Heading (°)', defaultPlacement(feature).heading, ...landscapeFurnishingControls.heading),
    range('scale', 'Scale', 'scale' in feature ? feature.scale : 1, ...landscapeFurnishingControls.scale),
    { type: 'color', key: 'color', label: 'Accent color', value: feature.color, rebuild: true },
  ],
  angle: -(('heading' in feature ? feature.heading : 0)) - landscapeFurnishingControls.stageAngleOffset,
  fieldSite: () => ({ name: 'Starter Island', offset: { x: feature.x, z: feature.z, y: walkingHeight(feature) }, replaceFeature: feature }),
  create(meshes, values) {
    const root = createSiteFeature(meshes, { ...feature, color: String(values.color) })
    const height = (p: Point) => walkingHeight({ x: feature.x + p.x, z: feature.z + p.z }) - walkingHeight(feature)
    const local = { ...feature, x: 0, z: 0 }
    const apply = () => poseSiteFeature(root, editedFeature(local, values), height)
    apply()
    return ({ seek }) => {
      if (seek) apply()
    }
  },
}))
