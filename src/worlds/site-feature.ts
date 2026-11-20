import type { Point } from '../world.ts'

export interface SiteFeature extends Point {
  site: string
  name: string
  model: FeatureModel
  color: string
  heading?: number
  scale?: number
  followSlope?: boolean
}

export type FeatureModel = 'tide-staff' | 'splitstone' | 'picnic' | 'benchmark' | 'rack' | 'planter' | 'crates' | 'bench' | 'marker' | 'shelter' | 'scope' | 'rail' | 'pennant' | 'barrels' | 'hose' | 'cairn' | 'gauge' | 'log' | 'lifebuoy'
