import { beachUmbrellaGeometry, shellRockProfile, streetLampGeometry, type SupportBox } from '../../assets/geometry/site-props.ts'
import { shellglassPoint, splitstone } from '../../routes.ts'
import type { SiteFeature } from '../site-feature.ts'

import { beachUmbrellaSites, lampPostSites, shellRockSites, splitstoneFeature, starterSiteProps, tideStaffFeature } from './layout/sites.ts'
export { driftwoodFoxgloves, driftwoodWrack, mirrorPoolWillow, ridgeLichenRocks, ridgeLichenSite, ridgeViewpoint, shellglassLimpets, shellglassStaff } from './layout/sites.ts'

export const starterFeatures = [
  ...starterSiteProps,
  { ...splitstoneFeature, ...splitstone },
  tideStaffFeature,
] as const satisfies readonly SiteFeature[]

export const beachUmbrellas = beachUmbrellaSites
  .map((point) => ({ ...point, geometry: beachUmbrellaGeometry }))
export const lampPosts = lampPostSites
  .map((point) => ({ ...point, geometry: streetLampGeometry }))

export const shellRocks = shellRockSites
  .map(([dx, dz, size, heading]) => {
    const depth = size * shellRockProfile.depthRatio
    const supportBoxes: readonly SupportBox[] = [[size, depth, shellRockProfile.supportHeight]]
    const geometry = { width: size, depth, height: shellRockProfile.height, centreHeight: shellRockProfile.centreHeight, supportBoxes }
    return { x: shellglassPoint.x + dx, z: shellglassPoint.z + dz, heading, geometry }
  })

export function onBeachTowel(point: { x: number, z: number }) {
  return beachUmbrellas.some(({ x, z, geometry }) => {
    const { centerX, halfWidth, halfDepth } = geometry.towel.exclusion
    return Math.abs(point.x - x - centerX) <= halfWidth && Math.abs(point.z - z) <= halfDepth
  })
}
