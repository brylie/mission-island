import { northernRegions } from './scenery.ts'
import { shellglassPoint } from './routes.ts'
import type { SiteFeature } from './site-props.ts'

export const starterFeatures: readonly SiteFeature[] = [
  { site: 'harbor', name: 'Depot freight stack', model: 'crates', color: '#d99752', x: -52.5, z: -17.8 },
  { site: 'amber-home', name: 'Amber cottage herb box', model: 'planter', color: '#f1b35a', x: -53.26, z: -6.98, scale: 0.8 },
  { site: 'blue-home', name: 'Blue cottage flower box', model: 'planter', color: '#8ed1c7', x: -46.3, z: -6.98, scale: 0.8 },
  { site: 'board', name: 'Harbor notice pennants', model: 'pennant', color: '#dda255', x: -42.05, z: -16.9, scale: 0.85 },
  { site: 'dock', name: 'Fishing net drying rack', model: 'rack', color: '#ef9856', x: -42.67, z: -30.9, heading: Math.PI / 2, scale: 0.8 },
  { site: 'town', name: 'Seabrook village bench', model: 'bench', color: '#53a197', x: 40.1, z: 17.3 },
  { site: 'market', name: 'Market produce stack', model: 'crates', color: '#a4bd6a', x: 42.44, z: 0.7 },
  { site: 'farm', name: 'Farm rain barrels', model: 'barrels', color: '#6b9b96', x: 28.75, z: -10.9 },
  { site: 'beach', name: 'Driftwood windshelter', model: 'shelter', color: '#e3916d', x: 33.5, z: -23.5, heading: 0.55 },
  { site: 'forest', name: 'Pinewoods trail marker', model: 'marker', color: '#d1a356', x: -23.6, z: 19.3 },
  { site: 'lookout', name: 'Lookout viewing scope', model: 'scope', color: '#deb77b', x: 5.42, z: 32.6, heading: 0.7 },
  { site: 'equipment', name: 'Fire supply flag line', model: 'pennant', color: '#d66c52', x: 25.1, z: 22.8, scale: 0.9 },
  { site: 'juniper', name: 'Juniper trail shelter', model: 'shelter', color: '#658476', x: northernRegions[0].site.x - .5, z: northernRegions[0].site.z },
  { site: 'fernfall', name: 'Fernfall gauge', model: 'marker', color: '#719caa', x: 8.5, z: 82 },
  { site: 'pool', name: 'Mirror Pool hide rail', model: 'rail', color: '#719783', heading: Math.PI / 2, x: 44.5, z: 106 },
  { site: 'ridge', name: 'Windstone survey scope', model: 'scope', color: '#e9af62', heading: -0.8, x: 36.5, z: 134 },
  { site: 'shellglass', name: 'Shellglass tide marks', model: 'marker', color: '#6caca6', scale: 0.72, ...shellglassPoint },
]
