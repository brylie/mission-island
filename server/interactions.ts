import { byTruckBed, freeBed, heldItem } from '../src/actions.ts'
import { deliberateActions, interactions, sameChoice } from '../src/interaction-options.ts'
import type { Interaction, InteractionChoice } from '../src/interaction-options.ts'
import { starterTools } from '../src/inventory.ts'
import { deliveryDrop, deliveryRadius } from '../src/jobs.ts'
import type { Item, Snapshot } from '../src/protocol.ts'
import { groundHeight, maxWadeDepth, waterDepth } from '../src/terrain.ts'
import { crateSize, distance, itemStarts, spawns } from '../src/world.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { stopPrimary, stopped, stowTool, type CrewMember } from './crew.ts'
import { restingY, updateHeldItems } from './items.ts'
import { recordCultivation } from './cultivation-cues.ts'
import { canOccupyGround, isInsideTruck } from '../src/simulation/movement.ts'
import type { createOrders } from './orders.ts'
import type { createGateRepair } from './gate-repair.ts'
import type { createResidents } from './residents.ts'
import type { createJournal } from './journal.ts'

export function createInteractions(
  state: Snapshot, growth: number[], physics: Pick<ReturnType<typeof createCargoPhysics>, 'load' | 'release' | 'remove'>,
  orders: Pick<ReturnType<typeof createOrders>, 'deliverCrate' | 'visitMarket'>,
  gate: Pick<ReturnType<typeof createGateRepair>, 'act'>,
  residents: Pick<ReturnType<typeof createResidents>, 'talk' | 'accept' | 'handOver' | 'stageCrate'>,
  journal: Pick<ReturnType<typeof createJournal>, 'record'>, checkpoint?: () => void,
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
    } else if (residents.stageCrate(item, player)) {
      return
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

  function pickUp(member: CrewMember, item: Item) {
    stopPrimary(member)
    stowTool(member)
    item.holder = member.player.id
    item.rotation = null
    physics.remove(item)
  }

  function turnIn(member: CrewMember) {
    stopPrimary(member)
    member.player.casting = null
    member.input = stopped
    member.player.sleeping = true
  }

  function tend(member: CrewMember, plot: number, action: 'plant' | 'harvest') {
    const { player } = member
    if (action === 'plant') {
      player.seeds--
      growth[plot] = 0
      state.farm[plot] = 'planted'
      return
    }
    state.farm[plot] = 'grass'
    player.goods.carrots++
    recordCultivation(state, 'harvest', plot, player.id)
  }

  function perform(member: CrewMember, { action, subject = -1 }: Interaction) {
    const item = state.items[subject]
    switch (action) {
      case 'put-down': return putDown(member, heldItem(state, member.player)!)
      case 'pick-up': return pickUp(member, item)
      case 'open-wardrobe':
      case 'open-clothing-counter': return member.notify?.({ type: action })
      case 'sleep': return turnIn(member)
      case 'chest': return useHomeChest(member)
      case 'market': return orders.visitMarket(member.player)
      case 'plant':
      case 'harvest': return tend(member, subject, action)
      case 'welcome-note': return member.notify?.({ type: 'crew-note' })
      case 'talk': return residents.talk(member, subject)
      case 'accept-favor': return residents.accept(member, subject)
      case 'hand-over': return residents.handOver(member, subject)
      case 'job-board': return
      case 'record': return journal.record(member.player, subject)
      default: return gate.act(member, action)
    }
  }

  // E runs the interaction the player chose, only while it is still open to them; with no choice, the best one in reach.
  function interact(member: CrewMember, choice?: InteractionChoice) {
    const { player } = member
    if (player.seat) return
    if (player.sleeping) {
      player.sleeping = false
      return
    }
    const options = interactions(state, player)
    const chosen = choice ? options.find((option) => sameChoice(option, choice))
      : options.find(({ action }) => !deliberateActions.includes(action))
    if (!chosen) return
    perform(member, chosen)
    updateHeldItems(state)
  }

  function respawn(member: CrewMember) {
    const { player } = member
    const item = heldItem(state, player)
    if (item) {
      item.holder = null
      const safe = canOccupyGround(player, crateSize / 2, -maxWadeDepth) && waterDepth(player) <= maxWadeDepth
      if (item.kind === 'crate') physics.release(item, safe ? player : itemStarts[item.id].start)
      else {
        const point = safe ? player : itemStarts[item.id].start
        Object.assign(item, { x: point.x, z: point.z, y: safe ? groundHeight(point) + 0.04 : restingY(item.id), spraying: false })
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
