import {
  lightShaderPresets,
  surfaceShaderPresets,
  vegetationShaderPresets,
  waterShaderPresets,
  type ShaderStudyPreset,
} from '../assets/interactive-shader-studies.ts'
import { falls, meadowHill, pool, streamX, tidePool } from '../terrain.ts'
import { juniperCenter } from '../juniper-habitat.ts'
import { market } from '../farm.ts'
import { harborDock, harborDockPiles, lookout } from '../world.ts'
import { lampPosts, ridgeLichenSite } from '../worlds/starter/sites.ts'
import type { Point } from '../world.ts'

export const shaderGroups = ['Water and shore', 'Vegetation and terrain', 'Built surfaces', 'Weather and light'] as const
type ShaderGroup = typeof shaderGroups[number]

const saltBloomPileDockOffset = 1.6
const saltBloomPileZ = -34
export const saltBloomPile = harborDockPiles.find((pile) => pile.x === harborDock.x - saltBloomPileDockOffset && pile.z === saltBloomPileZ)!

const families = [
  { group: shaderGroups[0], source: 'water', entries: waterShaderPresets },
  { group: shaderGroups[1], source: 'vegetation', entries: vegetationShaderPresets },
  { group: shaderGroups[2], source: 'surfaces', entries: surfaceShaderPresets },
  { group: shaderGroups[3], source: 'light', entries: lightShaderPresets },
] as const

export type StudyId = keyof typeof waterShaderPresets | keyof typeof vegetationShaderPresets | keyof typeof surfaceShaderPresets | keyof typeof lightShaderPresets

// Resolve previews against the same landmarks and channel as the live island.
const fieldTargets: Record<StudyId, Point> = {
  'skiff-wake': { x: -48, z: -41 },
  'wading-rings': { x: 46.2, z: -33.05 },
  'seabed-caustics': { x: tidePool.x + 0.2, z: tidePool.z - 0.6 },
  'water-rain-rings': { x: pool.x - 2, z: pool.z },
  'waterfall-shear': { x: streamX(87), z: 86.6 },
  'canopy-dapple': { x: juniperCenter.x + 2, z: juniperCenter.z - 3 },
  'reed-transmission': { x: pool.x - 13, z: pool.z - 3 },
  'sand-footprints': { x: 36.7, z: -36.8 },
  'ridge-lichen': { x: ridgeLichenSite.x, z: ridgeLichenSite.z },
  'closing-flowers': { x: meadowHill.x - 2.2, z: meadowHill.z - 1 },
  'timber-salt-bloom': { x: saltBloomPile.x, z: saltBloomPile.z },
  'awning-rain-load': { x: market.x - 3.9, z: market.z + 1.1 },
  'window-parallax': { x: -43.605, z: -6.765 },
  'road-retroreflector': { x: -33.5, z: -11 },
  'rope-fiber-sheen': { x: harborDock.x + 1.12, z: -32.45 },
  'fernfall-rainbow': { x: falls.x + 2, z: 89.3 },
  'cooling-embers': { x: lookout.x + 0.4, z: lookout.z + 0.2 },
  'streetlamp-droplets': { x: lampPosts[0].x, z: lampPosts[0].z - 0.31 },
  'meadow-pollen': { x: meadowHill.x - 0.4, z: meadowHill.z + 1.6 },
  'moon-glitter': { x: -44, z: -45 },
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
