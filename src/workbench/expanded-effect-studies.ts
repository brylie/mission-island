import { expandedEffectPresets } from '../assets/recipes/workbench-expanded-effect-studies'
import type { EffectStudy } from './effect-studies'
import { breathFixture, puddleFixture, sandFixture, sunbeamFixture, windowFixture } from './effect-air-fixtures'
import { ashFixture, crateGritFixture, ferrySparksFixture, sawdustFixture, wateringFixture } from './effect-job-fixtures'
import { chaffFixture, feathersFixture, fernFixture, hoeFixture, parachutesFixture } from './effect-land-fixtures'
import { eddyFixture, fishThrashFixture, submergedFixture, wadingFixture, wakeFixture } from './effect-water-fixtures'

type StudyId = typeof expandedEffectPresets[number]['id']

const fixtures: Record<StudyId, EffectStudy['fixture']> = {
  'skiff-wake-foam': wakeFixture,
  'wading-crescents': wadingFixture,
  'hooked-fish-thrash': fishThrashFixture,
  'submerged-bubble-trail': submergedFixture,
  'eddy-foam-flecks': eddyFixture,
  'puddle-strike-rings': puddleFixture,
  'window-spatter': windowFixture,
  'sunbeam-dust': sunbeamFixture,
  'sand-skitter': sandFixture,
  'cold-breath': breathFixture,
  'seed-parachutes': parachutesFixture,
  'wet-fern-shake': fernFixture,
  'hoe-soil-crumbs': hoeFixture,
  'harvest-chaff': chaffFixture,
  'takeoff-feathers': feathersFixture,
  'watering-can-shower': wateringFixture,
  'sawdust-fan': sawdustFixture,
  'crate-landing-grit': crateGritFixture,
  'wet-ash-steam': ashFixture,
  'ferry-repair-sparks': ferrySparksFixture,
}

export const expandedEffectStudies: EffectStudy[] = expandedEffectPresets.map((preset) => ({
  ...preset,
  fixture: fixtures[preset.id],
}))
