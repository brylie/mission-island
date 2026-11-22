import type { PlotAction } from '../src/interactions/work.ts'
import type { Snapshot } from '../src/protocol.ts'
import { recordCultivation } from './cultivation-cues.ts'
import type { InteractionHandlers } from './interactions.ts'

export function plotInteractions(state: Snapshot, growth: number[]): InteractionHandlers<PlotAction> {
  return {
    plant({ player }, plot) {
      player.seeds--
      growth[plot] = 0
      state.farm[plot] = 'planted'
    },
    harvest({ player }, plot) {
      state.farm[plot] = 'grass'
      player.goods.carrots++
      recordCultivation(state, 'harvest', plot, player.id)
    },
  }
}
