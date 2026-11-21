import { ferryDrop } from '../ferry-repair.ts'
import { toolboxPickable } from '../gate-repair.ts'
import { deliveryDrop, deliveryRadius } from '../jobs.ts'
import type { Item, Player, Snapshot } from '../protocol.ts'
import { stagingFavor, wantsCargo } from '../residents/favors.ts'
import { truckPoint } from '../truck-pose.ts'
import { cargoSlots, crateSize, distance, lookout, truckBed } from '../world.ts'
import { starterResidents } from '../worlds/starter/residents.ts'
import type { InteractionOption, InteractionPolicies } from './definition.ts'

export const cargoActions = {
  'put-down': 'default',
  'pick-up': 'default',
} as const satisfies InteractionPolicies
export type CargoAction = keyof typeof cargoActions

export function heldItem(state: Pick<Snapshot, 'items'>, player: Player) {
  return state.items.find((item) => item.holder === player.id)
}

export function freeBed(state: Snapshot) {
  return cargoSlots.find((slot) => {
    const position = truckPoint(state.truck, 0, truckBed.top + crateSize / 2, slot)
    return !state.items.some((item) => item.onBed && distance(item, position) < 0.93)
  })
}

export function byTruckBed(state: Snapshot, player: Player) {
  return distance(truckPoint(state.truck, 0, truckBed.top, truckBed.center), player) < 3.5
}

export function putDownOption(state: Snapshot, player: Player, item: Item): InteractionOption<CargoAction> {
  const option = { action: 'put-down' as const, name: 'Ground', key: 'E' }
  if (item.kind === 'toolbox') return { ...option, label: 'Set toolbox down' }
  if (item.kind === 'extinguisher') {
    return state.mission === 'fire' && distance(player, lookout) < 5
      ? { ...option, key: 'Left click', label: 'Hold to spray' }
      : { ...option, label: 'Set extinguisher down' }
  }
  if (ferryDrop(state, player, item)) return { ...option, label: 'Stack timber for the ferry repair' }
  const drop = deliveryDrop(state)
  if (drop && distance(player, drop) < deliveryRadius) return { ...option, label: 'Deliver crate' }
  const staging = stagingFavor(starterResidents, state, player)
  if (staging) return { ...option, label: `Stage crate for ${staging.resident.identity.name}` }
  if (byTruckBed(state, player) && freeBed(state) !== undefined) return { ...option, label: 'Load crate' }
  return { ...option, key: 'Left click', label: 'Hold to throw · E to set down' }
}

// Crates are cargo while a delivery is open, a resident has asked the crew to move one, or ferry timber is on the way.
function canPickUp(state: Pick<Snapshot, 'gateRepair' | 'mission' | 'jobs' | 'residents' | 'ferryRepair'>, item: Item, player: Player, cargoWanted: boolean) {
  const eligible = item.kind === 'crate'
    ? deliveryDrop(state) !== undefined || cargoWanted || state.ferryRepair.haul > 0
    : item.kind === 'toolbox' ? toolboxPickable(state, item) : state.mission === 'fire'
  return eligible && !item.delivered && item.holder === null && distance(item, player) < 2.7 && Math.abs(item.y - player.y) < 2.1
}

export function pickupOptions(state: Snapshot, player: Player): InteractionOption<CargoAction>[] {
  const cargoWanted = wantsCargo(starterResidents, state)
  return state.items.filter((item) => canPickUp(state, item, player, cargoWanted))
    .sort((a, b) => distance(a, player) - distance(b, player))
    .map((item) => {
      const name = item.kind === 'toolbox' ? 'Toolbox' : item.kind === 'crate' ? 'Crate' : 'Extinguisher'
      const label = item.onBed ? 'Unload crate' : item.kind === 'toolbox' ? 'Pick up the toolbox' : `Pick up ${name.toLowerCase()}`
      return { action: 'pick-up' as const, subject: item.id, key: 'E', label, name, at: { x: item.x, y: item.y + (item.kind === 'crate' ? 0 : 0.25), z: item.z }, radius: item.kind === 'crate' ? 0.6 : 0.4 }
    })
}
