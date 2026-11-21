import { atHomeChest, atHomeDoor, byTruckBed, clothingInteraction, freeBed, heldItem, nearbyItem } from '../src/actions.ts'
import { market, nearbyPlot } from '../src/farm.ts'
import { atFisher } from '../src/harbor-fisher.ts'
import { starterTools } from '../src/inventory.ts'
import { deliveryDrop, deliveryRadius } from '../src/jobs.ts'
import type { Item, Snapshot } from '../src/protocol.ts'
import { groundHeight, maxWadeDepth, waterDepth } from '../src/terrain.ts'
import { isNight } from '../src/weather.ts'
import { crateSize, crateStarts, distance, extinguisherStarts, spawns } from '../src/world.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { stopPrimary, stopped, stowTool, type CrewMember } from './crew.ts'
import { updateHeldItems } from './items.ts'
import { recordCultivation } from './cultivation-cues.ts'
import { canOccupyGround, isInsideTruck } from '../src/simulation/movement.ts'
import type { createOrders } from './orders.ts'

export function createInteractions(
  state: Snapshot, growth: number[], physics: Pick<ReturnType<typeof createCargoPhysics>, 'load' | 'release' | 'remove'>,
  orders: Pick<ReturnType<typeof createOrders>, 'deliverCrate' | 'visitMarket'>, checkpoint?: () => void,
) {
  function useHomeChest(member: CrewMember) {
    const { player } = member
    stopPrimary(member)
    const firstVisit = !player.starterSeedClaimed
    if (firstVisit) {
      player.starterSeedClaimed = true
      player.seeds++
      member.notify?.({ type: 'starter-seed' })
    }
    if (!player.inventory.length) {
      player.inventory = [...starterTools]
      player.equipped = 'fishing-rod'
    } else if (!firstVisit) {
      player.inventory = []
      stowTool(member)
    }
  }

  function putDown(member: CrewMember, item: Item) {
    const { player } = member
    stopPrimary(member)
    item.holder = null
    const dropoff = deliveryDrop(state)
    if (item.kind === 'crate' && dropoff && distance(player, dropoff) < deliveryRadius) {
      orders.deliverCrate(item)
    } else if (item.kind === 'crate') {
      const slot = byTruckBed(state, player) ? freeBed(state) : undefined
      if (slot === undefined) {
        const drop = canOccupyGround(item, crateSize / 2, -0.10) && !isInsideTruck(state.truck, item) ? item : player
        physics.release(item, drop, item.y)
      } else {
        physics.load(item, state.truck, slot)
      }
    } else {
      item.y = groundHeight(item) + 0.04
    }
  }

  function interact(member: CrewMember) {
    const { player } = member
    if (player.seat) return
    if (player.sleeping) {
      player.sleeping = false
      return
    }
    const ownDoor = atHomeDoor(player)
    const item = heldItem(state, player)
    const clothing = clothingInteraction(player)
    if (item) {
      putDown(member, item)
    } else if (clothing) {
      member.notify?.({ type: clothing })
    } else if (ownDoor && isNight(state.weather.hour)) {
      stopPrimary(member)
      player.casting = null
      member.input = stopped
      player.sleeping = true
      return
    } else if (!ownDoor && atHomeChest(player)) {
      useHomeChest(member)
    } else if (player.grounded && !player.onBed && distance(player, market) < 2.25) {
      orders.visitMarket(player)
    } else {
      const plot = player.grounded && !player.onBed ? nearbyPlot(player) : -1
      if (state.farm[plot] === 'tilled') {
        if (!player.seeds) return
        player.seeds--
        growth[plot] = 0
        state.farm[plot] = 'planted'
        return
      }
      if (state.farm[plot] === 'ripe') {
        state.farm[plot] = 'grass'
        player.goods.carrots++
        recordCultivation(state, 'harvest', plot, player.id)
        return
      }
      const nearby = nearbyItem(state, player)
      if (!nearby) {
        if (ownDoor) member.notify?.({ type: 'crew-note' })
        else if (atFisher(player, state.weather.hour)) member.notify?.({ type: 'fisher-chat' })
        return
      }
      stopPrimary(member)
      stowTool(member)
      nearby.holder = player.id
      nearby.rotation = null
      physics.remove(nearby)
    }
    updateHeldItems(state)
  }

  function respawn(member: CrewMember) {
    const { player } = member
    const item = heldItem(state, player)
    if (item) {
      item.holder = null
      const safe = canOccupyGround(player, crateSize / 2, -maxWadeDepth) && waterDepth(player) <= maxWadeDepth
      if (item.kind === 'crate') physics.release(item, safe ? player : crateStarts[item.id])
      else {
        const point = safe ? player : extinguisherStarts[item.id - crateStarts.length]
        Object.assign(item, { x: point.x, z: point.z, y: groundHeight(point) + 0.04, spraying: false })
      }
    }
    const home = spawns[player.id]
    Object.assign(player, { ...home, y: groundHeight(home), heading: 0, seat: null, grounded: true, onBed: false, truckSurface: undefined,
      swimming: false, sleeping: false, casting: null, reaching: false, rightHandRaised: false, throwing: false, rowing: false })
    stopPrimary(member)
    member.input = stopped
    member.verticalSpeed = 0
    member.reachUntil = 0
    member.throwUntil = 0
    checkpoint?.()
  }

  return { interact, respawn }
}
