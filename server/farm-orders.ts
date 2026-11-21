import { farmOrders, restoreFarmWork, type FarmAction, type FarmOrderId } from '../src/farm-orders.ts'
import type { Player, Snapshot } from '../src/protocol.ts'
import { pushedBarrowPose } from '../src/barrow.ts'
import { canPushBarrow } from './barrow-motion.ts'
import { distance } from '../src/world.ts'
import { barrowPickup } from '../src/worlds/starter/farm-order-sites.ts'
import { stopPrimary, stowTool, type CrewNotice } from './crew.ts'
import type { InteractionHandlers } from './interactions.ts'

export function createFarmOrders(state: Snapshot, notifyCrew: (notice: CrewNotice) => void, clock: () => number, checkpoint?: () => void) {
  const work = state.farmWork
  const { progress } = work

  function deliver(id: FarmOrderId, quantity: number) {
    progress.delivered += quantity
    const order = farmOrders[id]
    if (progress.delivered < order.quantity) return
    progress.stage = id === 'starter' ? 'qualified' : 'complete'
    progress.delivered = 0
    if (id === 'starter') work.barrow = restoreFarmWork(progress).barrow
    state.crewCoins += order.coins
    notifyCrew({ type: 'farm-pay', id, coins: order.coins })
  }

  function recover(handler: number) {
    const { barrow } = work
    if (!barrow || barrow.handler !== handler) return
    Object.assign(barrow, { ...barrowPickup, handler: null })
    checkpoint?.()
    notifyCrew({ type: 'barrow-returned' })
  }

  function tick(player: Player) {
    const { barrow } = work
    if (!barrow || barrow.handler !== player.id) return
    if (player.swimming || player.truckSurface) {
      recover(player.id)
      return
    }
    const next = pushedBarrowPose(player)
    if (next.x === barrow.x && next.z === barrow.z && next.heading === barrow.heading) return
    if (canPushBarrow(state, player, player)) Object.assign(barrow, next)
  }

  function parkBarrow(recall: boolean) {
    const { barrow } = work
    if (!barrow) return
    barrow.handler = null
    if (recall) Object.assign(barrow, barrowPickup)
  }

  const interactions = {
    'accept-produce'() {
      progress.stage = 'starter'
    },
    'accept-barrow-order'() {
      progress.stage = 'harvest'
    },
    'deliver-produce'({ player }) {
      const quantity = Math.min(player.goods.carrots, farmOrders.starter.quantity - progress.delivered)
      player.goods.carrots -= quantity
      deliver('starter', quantity)
    },
    'pack-barrow'(member) {
      const { player } = member
      const quantity = Math.min(player.goods.carrots, farmOrders.harvest.quantity - progress.delivered - progress.load)
      player.goods.carrots -= quantity
      progress.load += quantity
      if (work.barrow?.handler !== player.id) member.reachUntil = clock() + 420
    },
    'unload-barrow'() {
      const quantity = progress.load
      progress.load = 0
      deliver('harvest', quantity)
    },
    'grip-barrow'(member) {
      const { barrow } = work
      if (!barrow) return
      const { player } = member
      player.casting = null
      stopPrimary(member)
      stowTool(member)
      member.reachUntil = 0
      if (distance(barrow, player) > .1) player.heading = Math.atan2(barrow.x - player.x, barrow.z - player.z)
      barrow.handler = player.id
    },
    'park-barrow': () => parkBarrow(false),
    'recall-barrow': () => parkBarrow(true),
  } satisfies InteractionHandlers<FarmAction>

  return { interactions, tick, recover }
}
