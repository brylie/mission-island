import { beachUmbrellaGeometry, shellRockProfile, streetLampGeometry, type SupportBox } from '../../assets/geometry/site-props.ts'
import { shellglassPoint, splitstone } from '../../routes.ts'
import type { SiteFeature } from '../site-feature.ts'

export const ridgeViewpoint = { x: 36.5, z: 134 }
export const ridgeLichenSite = { x: 40.2, z: 131.1 }
export const ridgeLichenRocks = [[0, 0, 2.85], [-1.3, 0.78, 1.25], [0.95, 0.71, 0.83]] as const
export const mirrorPoolWillow = { x: 44.5, z: 106 }
export const shellglassStaff = { x: 44.65, z: -31.45 }
export const driftwoodWrack = { x: 42.6, z: -30.99 }
export const driftwoodFoxgloves = [
  { x: 40.4, z: -28.45 },
  { x: 39.9, z: -28.18 },
  { x: 40.78, z: -28.25 },
  { x: 40.25, z: -27.95 },
  { x: 41, z: -28.02 },
]
export const shellglassLimpets = [
  { x: 45.62, z: -31.27 },
  { x: 45.75, z: -31.34 },
  { x: 45.86, z: -31.25 },
]

export const starterFeatures = [
  { site: 'harbor', name: 'Depot freight stack', model: 'crates', color: '#d99752', x: -52.5, z: -17.8 },
  { site: 'amber-home', name: 'Amber cottage herb box', model: 'planter', color: '#f1b35a', x: -53.26, z: -7.15, scale: 0.8 },
  { site: 'blue-home', name: 'Blue cottage flower box', model: 'planter', color: '#8ed1c7', x: -46.3, z: -7.15, scale: 0.8 },
  { site: 'dock', name: 'Fishing net drying rack', model: 'rack', color: '#ef9856', x: -42.67, z: -30.9, heading: Math.PI / 2, scale: 0.8 },
  { site: 'town', name: 'Seabrook village bench', model: 'bench', color: '#53a197', x: 39, z: 17.65 },
  { site: 'market', name: 'Market produce stack', model: 'crates', color: '#a4bd6a', x: 41.15, z: 5.86 },
  { site: 'farm', name: 'Farm rain barrels', model: 'barrels', color: '#6b9b96', x: 28.75, z: -10.9 },
  { site: 'lookout', name: 'Lookout viewing scope', model: 'scope', color: '#deb77b', x: 5.42, z: 32.6, heading: 0.7 },
  { site: 'juniper', name: 'Juniper trail cairn', model: 'cairn', color: '#658476', x: -55.5, z: 66 },
  { site: 'fernfall', name: 'Fernfall stream gauge', model: 'gauge', color: '#719caa', x: 8.5, z: 82 },
  { site: 'pool', name: 'Mirror Pool fallen willow', model: 'log', color: '#80705b', heading: Math.PI / 2, ...mirrorPoolWillow },
  { site: 'ridge', name: 'Windstone survey scope', model: 'scope', color: '#e9af62', heading: -0.8, ...ridgeViewpoint },
  { site: 'splitstone', name: 'Splitstone sandstone cleft', model: 'splitstone', color: '#a78c6d', ...splitstone },
  { site: 'shellglass', name: 'Mended Shellglass tide staff', model: 'tide-staff', color: '#6caca6', heading: Math.PI, scale: 0.72, ...shellglassStaff },
] as const satisfies readonly SiteFeature[]

export const beachUmbrellas = [{ x: 26, z: -39.6 }, { x: 33, z: -37.7 }, { x: 38.1, z: -35.3 }]
  .map((point) => ({ ...point, geometry: beachUmbrellaGeometry }))
export const lampPosts = [{ x: -55, z: -7.1 }, { x: -39, z: -7.1 }, { x: 34, z: 17.45 }, { x: 46.5, z: 6.45 }]
  .map((point) => ({ ...point, geometry: streetLampGeometry }))

export const shellRocks = [[0.63, -0.98, 0.68, 0.9], [1.14, -1.55, 0.41, 1.6], [0.05, -1.36, 0.43, -1.1]]
  .map(([dx, dz, size, heading]) => {
    const depth = size * shellRockProfile.depthRatio
    const supportBoxes: readonly SupportBox[] = [[size, depth, shellRockProfile.supportHeight]]
    const geometry = { width: size, depth, height: shellRockProfile.height, centreHeight: shellRockProfile.centreHeight, supportBoxes }
    return { x: shellglassPoint.x + dx, z: shellglassPoint.z + dz, heading, geometry }
  })

export function onBeachTowel(point: { x: number, z: number }) {
  return beachUmbrellas.some(({ x, z }) => Math.abs(point.x - x - 0.9) <= 0.7 && Math.abs(point.z - z) <= 1.32)
}
