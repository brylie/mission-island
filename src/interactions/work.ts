import { farmPlots, market, nearbyPlot, saleValue, seedPrice } from '../farm.ts'
import { atJobBoard, jobBoard, orderContribution } from '../jobs.ts'
import type { Player, Snapshot } from '../protocol.ts'
import { distance } from '../world.ts'
import { aimedAt, type InteractionOption, type InteractionPolicies } from './definition.ts'

export const orderActions = {
  'job-board': 'default',
  'market': 'default',
} as const satisfies InteractionPolicies
export type OrderAction = keyof typeof orderActions

export const plotActions = {
  plant: 'default',
  harvest: 'default',
} as const satisfies InteractionPolicies
export type PlotAction = keyof typeof plotActions

export function orderInteractions(state: Snapshot, player: Player): InteractionOption<OrderAction>[] {
  const options: InteractionOption<OrderAction>[] = []
  if (state.mission === 'complete' && !state.jobs.active && atJobBoard(player)) {
    options.push({ action: 'job-board', key: 'E', label: 'Open the harbor job board', name: 'Harbor job board', at: aimedAt(jobBoard, 1.4), radius: 0.9 })
  }
  if (player.grounded && !player.onBed && distance(player, market) < 2.25) {
    const contribution = orderContribution(state, player.goods)
    const value = saleValue(player.goods)
    const label = contribution
      ? `Contribute ${contribution.quantity} ${contribution.goods === 'carrots' && contribution.quantity === 1 ? 'carrot' : contribution.goods} to crew order`
      : `Sell for ${value} coins · buy a carrot seed for ${seedPrice}`
    if (contribution || value) {
      options.push({ action: 'market', key: contribution ? 'E' : 'E / B', label, name: 'Seabrook Market', at: aimedAt(market, 1), radius: 1.2 })
    }
  }
  return options
}

export function plotInteractions(state: Snapshot, player: Player): InteractionOption<PlotAction>[] {
  const options: InteractionOption<PlotAction>[] = []
  const plot = player.grounded && !player.onBed ? nearbyPlot(player) : -1
  const stage = state.farm[plot]
  if ((stage === 'tilled' && player.seeds) || stage === 'ripe') {
    options.push({ action: stage === 'ripe' ? 'harvest' : 'plant', subject: plot, key: 'E', label: stage === 'ripe' ? 'Harvest carrots' : 'Plant a carrot seed', name: 'Farm plot', at: aimedAt(farmPlots[plot], 0.1), radius: 0.8 })
  }
  return options
}
