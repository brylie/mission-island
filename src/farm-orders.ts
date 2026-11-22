import { farm } from './farm.ts'
import type { InteractionOption, InteractionPolicies } from './interactions/definition.ts'
import type { Player } from './protocol.ts'
import { walkingHeight } from './terrain.ts'
import { distance, type Point, type Pose } from './world.ts'
import { barrowPickup, barrowPickupName, produceCounter } from './worlds/starter/farm-order-sites.ts'

const starterCarrotQuota = 2
const starterOrderCoins = 8
const barrowCarrotQuota = 6
const barrowOrderCoins = 22
export const farmOrders = {
  starter: { title: 'Carrots for Ines', quantity: starterCarrotQuota, coins: starterOrderCoins },
  harvest: { title: 'Seabrook barrow order', quantity: barrowCarrotQuota, coins: barrowOrderCoins },
} as const

const barrowStandReach = 1.8
const produceCounterReach = 1.15
const barrowReach = 2
const barrowUnloadReach = 2
const farmPackingReach = 8
const targetAimRadius = 0.7
const barrowAimHeight = 0.62
const barrowStandAimHeight = 0.8
export type FarmOrderId = keyof typeof farmOrders
type Stage = 'offer' | 'starter' | 'qualified' | 'harvest' | 'complete'
export type FarmProgress = { stage: Stage, delivered: number, load: number }
export type FarmWork = { progress: FarmProgress, barrow: (Pose & { handler: number | null }) | null }

export function farmingQualified(stage: Stage) {
  return stage === 'qualified' || stage === 'harvest' || stage === 'complete'
}

export function restoreFarmWork(progress: FarmProgress = { stage: 'offer', delivered: 0, load: 0 }): FarmWork {
  return { progress: { ...progress }, barrow: farmingQualified(progress.stage) ? { ...barrowPickup, handler: null } : null }
}

export const farmActions = {
  'accept-produce': 'explicit',
  'accept-barrow-order': 'explicit',
  'deliver-produce': 'explicit',
  'grip-barrow': 'explicit',
  'park-barrow': 'explicit',
  'pack-barrow': 'explicit',
  'unload-barrow': 'explicit',
  'recall-barrow': 'explicit',
} as const satisfies InteractionPolicies
export type FarmAction = keyof typeof farmActions

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
  const location = barrow && distance(barrow, barrowPickup) < barrowStandReach ? `at the ${barrowPickupName}` : 'marked on the map'
  return `${delivery} Barrow ${location} · ${load} packed.`
}

function targeted(action: FarmAction, label: string, name: string, point: Point, height: number): InteractionOption<FarmAction> {
  return { action, key: 'E', label, name, at: { ...point, y: walkingHeight(point) + height }, radius: targetAimRadius }
}

function produceInteractions(progress: FarmProgress, player: Player): InteractionOption<FarmAction>[] {
  const options: InteractionOption<FarmAction>[] = []
  const { stage, delivered } = progress
  const counter = (action: FarmAction, label: string) => targeted(action, label, 'Ines’s produce counter', produceCounter, 1)
  if (distance(player, produceCounter) < produceCounterReach) {
    if (stage === 'offer') options.push(counter('accept-produce', `Take Ines’s order · ${farmOffer('starter')}`))
    if (stage === 'qualified') options.push(counter('accept-barrow-order', `Take Ines’s barrow order · ${farmOffer('harvest')}`))
    if (stage === 'starter' && player.goods.carrots > 0) {
      const quantity = Math.min(player.goods.carrots, farmOrders.starter.quantity - delivered)
      options.push(counter('deliver-produce', `Give Ines ${carrotCount(quantity)}`))
    }
  }
  return options
}

const parkBarrow: InteractionOption<FarmAction> = { action: 'park-barrow', key: 'E', label: 'Set down the barrow', name: 'Farm barrow' }

export function farmInteractions({ progress, barrow }: FarmWork, player: Player, handsFull: boolean): InteractionOption<FarmAction>[] {
  if (handsFull || player.truckSurface || player.onBed) return []
  const handling = barrow?.handler === player.id
  if (!player.grounded) return handling ? [parkBarrow] : []
  const options: InteractionOption<FarmAction>[] = []
  if (!handling) options.push(...produceInteractions(progress, player))
  const { stage, delivered, load } = progress
  if (!barrow) return options
  const atBarrow = distance(player, barrow) < barrowReach
  const cart = (action: FarmAction, label: string) => targeted(action, label, 'Farm barrow', barrow, barrowAimHeight)
  if (atBarrow && stage === 'harvest') {
    const pack = Math.min(player.goods.carrots, farmOrders.harvest.quantity - delivered - load)
    if (distance(barrow, produceCounter) < barrowUnloadReach && load && (barrow.handler === null || handling)) {
      options.push(cart('unload-barrow', `Deliver ${carrotCount(load)} to Ines`))
    }
    else if (pack > 0 && distance(barrow, farm) < farmPackingReach) {
      options.push(cart('pack-barrow', `Pack ${carrotCount(pack)} into the barrow`))
    }
  }
  if (handling) options.push(parkBarrow)
  else if (atBarrow && barrow.handler === null) options.push(cart('grip-barrow', 'Grip the barrow · Walk to push'))
  if (barrow.handler === null && distance(barrow, barrowPickup) >= barrowStandReach && distance(player, barrowPickup) < barrowStandReach) {
    options.push(targeted('recall-barrow', 'Recover the shared barrow here', barrowPickupName, barrowPickup, barrowStandAimHeight))
  }
  return options
}
