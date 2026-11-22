import {
  lightShaderPresets,
  surfaceShaderPresets,
  vegetationShaderPresets,
  waterShaderPresets,
  type ShaderStudyPreset,
} from '../assets/recipes/interactive-shader-studies.ts'
import { streetLampGeometry } from '../assets/geometry/site-props.ts'
import { falls, meadowHill, pool, streamX, tidePool } from '../terrain.ts'
import { juniperCenter } from '../juniper-habitat.ts'
import { market } from '../farm.ts'
import { harborDock, harborDockPiles, lookout } from '../world.ts'
import { lampPosts, ridgeLichenSite } from '../worlds/starter/sites.ts'
import type { Point } from '../world.ts'
import { harborDockPileLayout, starterShaderSites as sites } from '../worlds/starter/layout/places.ts'

export const shaderGroups = ['Water and shore', 'Vegetation and terrain', 'Built surfaces', 'Weather and light'] as const
type ShaderGroup = typeof shaderGroups[number]

const [westPileX] = harborDockPileLayout.lateralOffsets
const [, middlePileDepth] = harborDockPileLayout.distanceAlongDock
export const saltBloomPile = harborDockPiles.find((pile) =>
  pile.x === harborDock.x + westPileX && pile.z === harborDock.firstZ - middlePileDepth)!

const families = [
  { group: shaderGroups[0], source: 'water', entries: waterShaderPresets },
  { group: shaderGroups[1], source: 'vegetation', entries: vegetationShaderPresets },
  { group: shaderGroups[2], source: 'surfaces', entries: surfaceShaderPresets },
  { group: shaderGroups[3], source: 'light', entries: lightShaderPresets },
] as const

export type StudyId = keyof typeof waterShaderPresets | keyof typeof vegetationShaderPresets | keyof typeof surfaceShaderPresets | keyof typeof lightShaderPresets

const beside = (point: Point, offset: Point) => ({ x: point.x + offset.x, z: point.z + offset.z })

// Resolve previews against the same landmarks and channel as the live island.
const fieldTargets: Record<StudyId, Point> = {
  'skiff-wake': sites.wake,
  'wading-rings': sites.wading,
  'seabed-caustics': beside(tidePool, sites.caustics),
  'water-rain-rings': beside(pool, sites.poolRain),
  'waterfall-shear': { x: streamX(sites.fernfall.centerAtZ), z: sites.fernfall.z },
  'canopy-dapple': beside(juniperCenter, sites.canopy),
  'reed-transmission': beside(pool, sites.reeds),
  'sand-footprints': { x: sites.sand.x, z: sites.sand.z },
  'ridge-lichen': { x: ridgeLichenSite.x, z: ridgeLichenSite.z },
  'closing-flowers': beside(meadowHill, sites.flowers),
  'timber-salt-bloom': { x: saltBloomPile.x, z: saltBloomPile.z },
  'awning-rain-load': beside(market, sites.awning),
  'window-parallax': sites.blueCottageWindow,
  'road-retroreflector': sites.reflectors,
  'rope-fiber-sheen': { x: harborDock.x + sites.ropeAtDock.x, z: sites.ropeAtDock.z },
  'fernfall-rainbow': { x: falls.x + sites.rainbow.x, z: sites.rainbow.z },
  'cooling-embers': beside(lookout, sites.embers),
  'streetlamp-droplets': { x: lampPosts[0].x, z: lampPosts[0].z + streetLampGeometry.bulb.z },
  'meadow-pollen': beside(meadowHill, sites.pollen),
  'moon-glitter': sites.moon,
}

interface StudyEntry extends ShaderStudyPreset {
  field: ShaderStudyPreset['field'] & { point: Point }
  id: StudyId
  group: ShaderGroup
  source: string
}

export const interactiveStudies: readonly StudyEntry[] = families.flatMap(({ group, source, entries }) =>
  (Object.entries(entries) as [StudyId, ShaderStudyPreset][]).map(([id, study]) => {
    const { site, ...framing } = study.field
    return {
      ...study,
      field: { site, point: fieldTargets[id], ...framing },
      id,
      group,
      source: 'src/interactive-shaders/' + source + '.ts',
    }
  }))
