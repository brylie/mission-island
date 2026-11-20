import { shellglassPoint, splitstone } from '../../routes.ts'
import type { SiteFeature } from '../site-feature.ts'

export const ridgeViewpoint = { x: 36.5, z: 134 }

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
  { site: 'pool', name: 'Mirror Pool fallen willow', model: 'log', color: '#80705b', heading: Math.PI / 2, x: 44.5, z: 106 },
  { site: 'ridge', name: 'Windstone survey scope', model: 'scope', color: '#e9af62', heading: -0.8, ...ridgeViewpoint },
  { site: 'splitstone', name: 'Splitstone sandstone cleft', model: 'splitstone', color: '#a78c6d', ...splitstone },
  { site: 'shellglass', name: 'Mended Shellglass tide staff', model: 'tide-staff', color: '#6caca6', heading: Math.PI, scale: 0.72, x: 43, z: -36 },
] as const satisfies readonly SiteFeature[]

export const beachUmbrellas = [{ x: 26, z: -39.6 }, { x: 33, z: -37.7 }, { x: 38.1, z: -35.3 }]
export const lampPosts = [{ x: -55, z: -7.1 }, { x: -39, z: -7.1 }, { x: 34, z: 17.45 }, { x: 46.5, z: 6.45 }]

export const shellRocks = [[.63, -.98, .68, .9], [1.14, -1.55, .41, 1.6], [.05, -1.36, .43, -1.1]]
  .map(([dx, dz, size, heading]) => ({ x: shellglassPoint.x + dx, z: shellglassPoint.z + dz, size, heading }))

export function onBeachTowel(point: { x: number; z: number }) {
  return beachUmbrellas.some(({ x, z }) => Math.abs(point.x - x - .9) <= .7 && Math.abs(point.z - z) <= 1.32)
}
