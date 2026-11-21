import { ferryDrop } from '../src/ferry-repair.ts'
import { byTruckBed, freeBed, heldItem, type CargoAction } from '../src/interactions/cargo.ts'
import { deliveryDrop, deliveryRadius } from '../src/jobs.ts'
import type { Item, Snapshot } from '../src/protocol.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { canOccupyGround, isInsideTruck } from '../src/simulation/movement.ts'
import { groundHeight } from '../src/terrain.ts'
import { crateSize, distance, type Point } from '../src/world.ts'
import { stopPrimary, stowTool, type CrewMember } from './crew.ts'
import type { InteractionHandlers } from './interactions.ts'

type CargoDestinations = {
  ferry: (item: Item, playerId: number) => void
  delivery: (item: Item) => void
  resident: (item: Item, at: Point) => boolean
}

export function cargoInteractions(
  state: Snapshot,
  physics: Pick<ReturnType<typeof createCargoPhysics>, 'load' | 'release' | 'remove'>,
  destinations: CargoDestinations,
): InteractionHandlers<CargoAction> {
  function putDown(member: CrewMember, item: Item) {
    const { player } = member
    stopPrimary(member)
    item.holder = null
    const dropoff = deliveryDrop(state)
    if (ferryDrop(state, player, item)) {
      destinations.ferry(item, player.id)
    } else if (item.kind === 'crate' && dropoff && distance(player, dropoff) < deliveryRadius) {
      destinations.delivery(item)
    } else if (destinations.resident(item, player)) {
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

  return {
    'put-down': (member) => putDown(member, heldItem(state, member.player)!),
    'pick-up': (member, subject) => pickUp(member, state.items[subject]),
  }
}
