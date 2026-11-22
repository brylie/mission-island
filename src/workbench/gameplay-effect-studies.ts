import { gameplayEffectPresets } from '../assets/recipes/workbench-gameplay-effect-studies'
import type { EffectStudy } from './effect-studies'
import { canvasRunoffFixture, gateFrostFixture, mothFixture, snuffFixture, ventFixture } from './gameplay-air-fixtures'
import { brakeChipsFixture, chalkFixture, grainSpillFixture, hoistFixture, washFixture } from './gameplay-job-fixtures'
import { carrotPullFixture, cloverStepFixture, hedgeFixture, hiveTrafficFixture, slateFixture } from './gameplay-land-fixtures'
import { bobberFixture, bootTrailFixture, hullDrainFixture, mooringShakeFixture, slipwayFixture } from './gameplay-water-fixtures'

type StudyId = typeof gameplayEffectPresets[number]['id']

const fixtures: Record<StudyId, EffectStudy['fixture']> = {
  'bobber-bite-dip': bobberFixture,
  'slipway-tire-sheet': slipwayFixture,
  'hull-drain-trickle': hullDrainFixture,
  'mooring-line-shake': mooringShakeFixture,
  'boot-drain-trail': bootTrailFixture,
  'lantern-moths': mothFixture,
  'workshop-vent-steam': ventFixture,
  'gate-frost-shake': gateFrostFixture,
  'canvas-runoff': canvasRunoffFixture,
  'lantern-snuff-curl': snuffFixture,
  'carrot-pull-crumbs': carrotPullFixture,
  'hive-entrance-traffic': hiveTrafficFixture,
  'clover-petal-scatter': cloverStepFixture,
  'loose-slate-tumble': slateFixture,
  'hedge-clipping-fall': hedgeFixture,
  'gravel-brake-chips': brakeChipsFixture,
  'tailgate-grain-spill': grainSpillFixture,
  'hoist-chain-shake': hoistFixture,
  'wash-station-rinse': washFixture,
  'chalk-line-snap': chalkFixture,
}

export const gameplayEffectStudies: EffectStudy[] = gameplayEffectPresets.map((preset) => ({
  ...preset,
  fixture: fixtures[preset.id],
}))
