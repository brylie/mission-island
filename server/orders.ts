import { atClothingCounter, heldItem } from '../src/actions.ts'
import { clothingCatalog, ownsClothing, type ClothingId } from '../src/clothing-catalog.ts'
import { market, saleValue, seedPrice } from '../src/farm.ts'
import { atJobBoard, jobs, orderContribution } from '../src/jobs.ts'
import type { JobId } from '../src/jobs.ts'
import type { Item, Player, Snapshot } from '../src/protocol.ts'
import { crateStarts, distance, starterPay } from '../src/world.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import type { CrewMember, CrewNotice } from './crew.ts'

export function createOrders(
  state: Pick<Snapshot, 'crewCoins' | 'lastStarterPay' | 'items' | 'jobs' | 'mission' | 'islandTime' | 'lookoutFireClearedAt' | 'ferryRepair'>,
  physics: Pick<ReturnType<typeof createCargoPhysics>, 'remove' | 'relocate'>, notifyCrew: (message: CrewNotice) => void,
  creditCrate: (id: number) => void, checkpoint?: () => void,
) {
  function payCrew(message: Extract<CrewNotice, { type: 'job-pay' | 'order-pay' | 'market-sale' }>) {
    state.crewCoins += message.coins
    if (message.type === 'job-pay') state.lastStarterPay = message.job
    notifyCrew(message)
  }

  // Ferry timber rides in the depot crates, so a delivery order waits until the haul is stacked at the yard.
  function timberOnTheWay(id: JobId | undefined) {
    return id !== undefined && jobs[id].kind === 'delivery' && state.ferryRepair.haul > 0
  }

  function startJob(member: CrewMember, id: JobId | undefined) {
    if (id === undefined || state.mission !== 'complete' || state.jobs.active || !atJobBoard(member.player) ||
      member.player.sleeping || heldItem(state, member.player) || timberOnTheWay(id)) {
      member.notify?.({ type: 'order-unavailable' })
      return
    }
    const job = jobs[id]
    state.jobs.active = { id, progress: 0 }
    if (job.kind === 'delivery') {
      for (const [i, point] of crateStarts.entries()) {
        const crate = state.items[i]
        physics.remove(crate)
        Object.assign(crate, { holder: null, heading: 0, delivered: i >= job.quantity })
        if (!crate.delivered) physics.relocate(crate, point)
      }
    }
    checkpoint?.()
  }

  function advanceOrder(quantity: number) {
    const order = state.jobs.active
    if (!order) return
    order.progress += quantity
    const job = jobs[order.id]
    if (order.progress < job.quantity) return
    state.jobs.active = null
    state.jobs.completed++
    payCrew({ type: 'order-pay', id: order.id, coins: job.coins })
  }

  function deliverCrate(item: Item) {
    if (item.delivered) return
    creditCrate(item.id)
    item.delivered = true
    if (state.jobs.active) {
      advanceOrder(1)
    } else if (state.items.filter((entry) => entry.kind === 'crate').every((crate) => crate.delivered)) {
      state.mission = 'fire'
      delete state.lookoutFireClearedAt
      payCrew({ type: 'job-pay', job: 'delivery', coins: starterPay.delivery.coins })
    } else {
      payCrew({ type: 'job-pay', job: 'crate', coins: starterPay.crate.coins })
    }
  }

  function visitMarket(player: Player) {
    const contribution = orderContribution(state, player.goods)
    if (contribution) {
      player.goods[contribution.goods] -= contribution.quantity
      advanceOrder(contribution.quantity)
      return
    }
    const proceeds = saleValue(player.goods)
    if (!proceeds) return
    player.goods = { fish: 0, carrots: 0 }
    payCrew({ type: 'market-sale', coins: proceeds })
  }

  function completeFire() {
    state.mission = 'complete'
    state.lookoutFireClearedAt = state.islandTime
    payCrew({ type: 'job-pay', job: 'fire', coins: starterPay.fire.coins })
    for (const tool of state.items.filter(({ kind }) => kind === 'extinguisher')) {
      tool.holder = null
      tool.spraying = false
    }
    checkpoint?.()
  }

  function buySeed(player: Player) {
    if (player.seat || !player.grounded || player.onBed || heldItem(state, player) ||
      distance(player, market) >= 2.25 || state.crewCoins < seedPrice) return
    state.crewCoins -= seedPrice
    player.seeds++
    checkpoint?.()
  }

  function buyClothing(player: Player, id: ClothingId) {
    if (!atClothingCounter(player) || heldItem(state, player)) return 'away'
    if (ownsClothing(player, id)) return 'already-owned'
    const { price } = clothingCatalog[id]
    if (state.crewCoins < price) return 'insufficient-funds'
    state.crewCoins -= price
    if (id === 'angler') player.ownsAngler = true
    else player.ownedClothes = [...(player.ownedClothes ?? []), id]
    checkpoint?.()
    return 'bought'
  }

  return { startJob, deliverCrate, visitMarket, completeFire, buySeed, buyClothing }
}
