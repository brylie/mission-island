import type { SiteFeature } from '../site-props.ts'
import { viaductWalk } from './sites.ts'

export const saltwindFeatures: readonly SiteFeature[] = [
  { site: 'ferry', name: 'Ferry passenger waiting shelter', model: 'shelter', color: '#9b6451', x: -264.5, z: -225, heading: Math.PI / 2 },
  { site: 'fish-market', name: 'Fish hall net rack', model: 'rack', color: '#768dad', x: -253, z: -123 },
  { site: 'apartments', name: 'Quay apartments herb boxes', model: 'planter', color: '#f3bc72', x: -312.3, z: -134.5 },
  { site: 'grocery', name: 'Grocery produce display', model: 'crates', color: '#8ea456', x: -323.3, z: -83.6 },
  { site: 'farmers-market', name: 'Farmers market produce display', model: 'crates', color: '#ce8354', x: 145, z: -41 },
  { site: 'fields', name: 'Long Acre rain barrels', model: 'barrels', color: '#789a83', x: 178.4, z: 31.7 },
  { site: 'school', name: 'Schoolyard reading bench', model: 'bench', color: '#dca752', x: 258.5, z: -41, heading: Math.PI / 2 },
  { site: 'hospital', name: 'Hospital garden planter', model: 'planter', color: '#9fc8a6', x: 126.2, z: 112.8 },
  { site: 'alderwatch', name: 'Alderwatch village bench', model: 'bench', color: '#7f8c6b', x: -40, z: 165.3 },
  { site: 'church', name: 'Chapel garden planter', model: 'planter', color: '#dda2a1', x: -29, z: 181.5 },
  { site: 'cemetery', name: 'Cemetery remembrance bench', model: 'bench', color: '#778678', x: 25, z: 179, heading: Math.PI },
  { site: 'fire', name: 'Fire station hose rack', model: 'hose', color: '#c5634d', x: -69.6, z: 184.3 },
  { site: 'fishing', name: 'Sandspit float rack', model: 'rack', color: '#d99149', x: -249.1, z: -257.5, heading: Math.PI / 2, scale: 1.1 },
  { site: 'rescue', name: 'Rescue slip lifebuoy', model: 'lifebuoy', color: '#c97653', x: -303.3, z: -224, heading: Math.PI / 2 },
  { site: 'lake', name: 'Mirror Lake picnic bench', model: 'bench', color: '#72a997', x: -104, z: 145, heading: -.48 },
  { site: viaductWalk.id, name: 'Tarnstep viewing scope', model: 'scope', color: '#b69462', heading: -2.43, x: viaductWalk.x, z: viaductWalk.z },
]
