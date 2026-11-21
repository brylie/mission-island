import { farmOrders, restoreFarmWork, type FarmAction, type FarmOrderId } from '../src/farm-orders.ts'
import type { Player, Snapshot } from '../src/protocol.ts'
import { canOccupyGround, isInsideTruck } from '../src/simulation/movement.ts'
import { walkingHeight, waterDepth } from '../src/terrain.ts'
import { distance, offset } from '../src/world.ts'
import { barrowPickup } from '../src/worlds/starter/farm-order-sites.ts'
import { stopPrimary, stowTool, type CrewMember, type CrewNotice } from './crew.ts'

export function createFarmOrders(state: Snapshot, notifyCrew: (notice: CrewNotice) => void, checkpoint?: () => void) {
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
    const front = offset(player, 0, .88)
    if (canOccupyGround(front, .45, 0) && waterDepth(front) < .15 && !isInsideTruck(state.truck, front) &&
      Math.abs(walkingHeight(front) - walkingHeight(player)) < .43) {
      Object.assign(barrow, { ...front, heading: player.heading })
    } else if (distance(barrow, player) > 1.8) {
      barrow.handler = null
      checkpoint?.()
      notifyCrew({ type: 'barrow-parked' })
    }
  }

  function act(member: CrewMember, action: FarmAction) {
    const { player } = member
    const { barrow } = work
    switch (action) {
      case 'accept-produce':
        progress.stage = 'starter'
        break
      case 'accept-barrow-order':
        progress.stage = 'harvest'
        break
      case 'deliver-produce': {
        const quantity = Math.min(player.goods.carrots, farmOrders.starter.quantity - progress.delivered)
        player.goods.carrots -= quantity
        deliver('starter', quantity)
        break
      }
      case 'pack-barrow': {
        const quantity = Math.min(player.goods.carrots, farmOrders.harvest.quantity - progress.delivered - progress.load)
        player.goods.carrots -= quantity
        progress.load += quantity
        break
      }
      case 'unload-barrow': {
        const quantity = progress.load
        progress.load = 0
        deliver('harvest', quantity)
        break
      }
      case 'grip-barrow':
        if (!barrow) return
        player.casting = null
        stopPrimary(member)
        stowTool(member)
        if (distance(barrow, player) > .1) player.heading = Math.atan2(barrow.x - player.x, barrow.z - player.z)
        barrow.handler = player.id
        break
      case 'park-barrow':
      case 'recall-barrow':
        if (!barrow) return
        barrow.handler = null
        if (action === 'recall-barrow') Object.assign(barrow, barrowPickup)
        break
    }
  }

  return { act, tick, recover }
}
