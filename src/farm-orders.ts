import { farm } from './farm.ts'
import type { Interaction } from './interaction-options.ts'
import type { Player } from './protocol.ts'
import { walkingHeight } from './terrain.ts'
import { distance, type Point, type Pose } from './world.ts'
import { barrowPickup, barrowPickupName, produceCounter } from './worlds/starter/farm-order-sites.ts'

export const farmOrders = {
  starter: { title: 'Carrots for Ines', quantity: 2, coins: 8 },
  harvest: { title: 'Seabrook barrow order', quantity: 6, coins: 22 },
} as const
export type FarmOrderId = keyof typeof farmOrders
type Stage = 'offer' | 'starter' | 'qualified' | 'harvest' | 'complete'
export type FarmProgress = { stage: Stage; delivered: number; load: number }
export type FarmWork = { progress: FarmProgress; barrow: (Pose & { handler: number | null }) | null }

export function farmingQualified(stage: Stage) {
  return stage === 'qualified' || stage === 'harvest' || stage === 'complete'
}

export function restoreFarmWork(progress: FarmProgress = { stage: 'offer', delivered: 0, load: 0 }): FarmWork {
  return { progress: { ...progress }, barrow: farmingQualified(progress.stage) ? { ...barrowPickup, handler: null } : null }
}

export const farmActions = [
  'accept-produce', 'accept-barrow-order', 'deliver-produce', 'grip-barrow', 'park-barrow', 'pack-barrow', 'unload-barrow', 'recall-barrow',
] as const
export type FarmAction = typeof farmActions[number]

export function isFarmAction(action: Interaction['action']): action is FarmAction {
  return farmActions.some((farmAction) => farmAction === action)
}

function carrotCount(quantity: number) {
  return `${quantity} ${quantity === 1 ? 'carrot' : 'carrots'}`
}

export function farmOffer(id: FarmOrderId) {
  const { quantity, coins } = farmOrders[id]
  return `${carrotCount(quantity)} to Seabrook Market · ${coins} coins for the crew`
}

export function farmOrderStatus({ progress, barrow }: FarmWork): string {
  const { stage, delivered, load } = progress
  if (stage === 'offer') return ''
  if (stage === 'qualified') return `Farming qualified · Collect the shared barrow at the ${barrowPickupName} and take the next order at Ines’s produce counter. Farm workwear is available in your wardrobe.`
  if (stage === 'complete') return 'Farming qualified · Ines’s barrow order is complete.'
  const remaining = carrotCount(farmOrders[stage].quantity - delivered)
  const delivery = `Ines still needs ${remaining} at Seabrook Market.`
  if (stage === 'starter') return delivery
  const location = barrow && distance(barrow, barrowPickup) < 1.8 ? `at the ${barrowPickupName}` : 'marked on the map'
  return `${delivery} Barrow ${location} · ${load} packed.`
}

function targeted(action: FarmAction, label: string, name: string, point: Point, height: number): Interaction {
  return { action, key: 'E', label, name, at: { ...point, y: walkingHeight(point) + height }, radius: .7 }
}

function produceInteractions(progress: FarmProgress, player: Player): Interaction[] {
  const options: Interaction[] = []
  const { stage, delivered } = progress
  const counter = (action: FarmAction, label: string) => targeted(action, label, 'Ines’s produce counter', produceCounter, 1)
  if (distance(player, produceCounter) < 1.15) {
    if (stage === 'offer') options.push(counter('accept-produce', `Take Ines’s order · ${farmOffer('starter')}`))
    if (stage === 'qualified') options.push(counter('accept-barrow-order', `Take Ines’s barrow order · ${farmOffer('harvest')}`))
    if (stage === 'starter' && player.goods.carrots > 0) {
      const quantity = Math.min(player.goods.carrots, farmOrders.starter.quantity - delivered)
      options.push(counter('deliver-produce', `Give Ines ${carrotCount(quantity)}`))
    }
  }
  return options
}

const parkBarrow: Interaction = { action: 'park-barrow', key: 'E', label: 'Set down the barrow', name: 'Farm barrow' }

export function farmInteractions({ progress, barrow }: FarmWork, player: Player, handsFull: boolean): Interaction[] {
  if (handsFull || player.truckSurface || player.onBed) return []
  const handling = barrow?.handler === player.id
  if (!player.grounded) return handling ? [parkBarrow] : []
  const options: Interaction[] = []
  if (!handling) options.push(...produceInteractions(progress, player))
  const { stage, delivered, load } = progress
  if (!barrow) return options
  const atBarrow = distance(player, barrow) < 2
  const cart = (action: FarmAction, label: string) => targeted(action, label, 'Farm barrow', barrow, .62)
  if (atBarrow && stage === 'harvest') {
    const pack = Math.min(player.goods.carrots, farmOrders.harvest.quantity - delivered - load)
    if (distance(barrow, produceCounter) < 2 && load && (barrow.handler === null || handling)) {
      options.push(cart('unload-barrow', `Deliver ${carrotCount(load)} to Ines`))
    } else if (pack > 0 && distance(barrow, farm) < 8) {
      options.push(cart('pack-barrow', `Pack ${carrotCount(pack)} into the barrow`))
    }
  }
  if (handling) options.push(parkBarrow)
  else if (atBarrow && barrow.handler === null) options.push(cart('grip-barrow', 'Grip the barrow · Walk to push'))
  if (barrow.handler === null && distance(barrow, barrowPickup) >= 1.8 && distance(player, barrowPickup) < 1.8) {
    options.push(targeted('recall-barrow', 'Recover the shared barrow here', barrowPickupName, barrowPickup, .8))
  }
  return options
}
