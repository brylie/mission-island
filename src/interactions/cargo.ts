import { ferryDrop } from '../ferry-repair.ts'
import { onBench, toolboxLoanForSwollenGate, toolboxPickable, wrenLendsToolbox } from '../gate-repair.ts'
import { deliveryDrop, deliveryRadius, lookoutSprayReach } from '../jobs.ts'
import type { Item, Player, Snapshot } from '../protocol.ts'
import { stagingFavor, wantsCargo } from '../residents/favors.ts'
import { truckPoint } from '../truck-pose.ts'
import { cargoSlots, crateSize, distance, lookout, truckBed } from '../world.ts'
import { starterResidents } from '../worlds/starter/residents.ts'
import type { InteractionOption, InteractionPolicies } from './definition.ts'
import { canStow, canTakeStowed, floats, isRescueGear, isVehicleGear, itemName, rescueGear } from '../rescue-gear.ts'

const half = 2

const occupiedBedSlotRadius = 0.93
const truckBedReach = 3.5
const itemPickupReach = 2.7
const itemPickupVerticalReach = 2.1
const toolTargetLift = 0.25
const crateTargetRadius = 0.6
const toolTargetRadius = 0.4
const stowedTargetRadius = 0.2

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
    const position = truckPoint(state.truck, 0, truckBed.top + crateSize / half, slot)
    return !state.items.some((item) => item.onBed && distance(item, position) < occupiedBedSlotRadius)
  })
}

export function byTruckBed(state: Snapshot, player: Player) {
  return distance(truckPoint(state.truck, 0, truckBed.top, truckBed.center), player) < truckBedReach
}

// Held rescue gear: stow it at the pickup, or say what left click does with it.
function gearPutDownOption(state: Snapshot, player: Player, item: Item, option: { action: 'put-down', name: string, key: string }) {
  const name = itemName(item.kind).toLowerCase()
  if (canStow(state, player, item)) return { ...option, name: 'Fire and Rescue pickup', label: `Stow ${name} in the pickup` }
  if (item.kind === 'extinguisher') return { ...option, key: 'Left click', label: 'Hold to spray · E to set down' }
  if (!isRescueGear(item.kind)) return
  const { hint, use } = rescueGear[item.kind]
  // The flashlight shines while held, so it needs no click.
  if (use === 'light') return { ...option, label: `${hint} · Set flashlight down` }
  return { ...option, key: 'Left click', label: `${hint} · E to set down` }
}

export function putDownOption(state: Snapshot, player: Player, item: Item): InteractionOption<CargoAction> {
  const option = { action: 'put-down' as const, name: 'Ground', key: 'E' }
  if (item.kind === 'toolbox') return { ...option, label: 'Set toolbox down' }
  if (isVehicleGear(item)) return gearPutDownOption(state, player, item, option)!
  if (item.kind === 'extinguisher') {
    return state.mission === 'fire' && distance(player, lookout) < lookoutSprayReach
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
// Pickup gear is always free to use, but only leaves the bed while the pickup is stopped.
function canPickUp(state: Pick<Snapshot, 'gateRepair' | 'mission' | 'jobs' | 'residents' | 'ferryRepair' | 'vehicles'>, item: Item, player: Player, cargoWanted: boolean) {
  const eligible = isVehicleGear(item)
    ? !item.stowed || canTakeStowed(state, item, player)
    : item.kind === 'crate'
      ? deliveryDrop(state) !== undefined || cargoWanted || state.ferryRepair.haul > 0
      : item.kind === 'toolbox' ? toolboxPickable(state, item) : state.mission === 'fire'
  return eligible && !item.delivered && item.holder === null && distance(item, player) < itemPickupReach && Math.abs(item.y - player.y) < itemPickupVerticalReach
}

function pickupLabel(state: Snapshot, item: Item, name: string) {
  if (item.stowed) return `Take ${name.toLowerCase()} from the pickup`
  if (item.onBed) return 'Unload crate'
  if (item.kind !== 'toolbox') return `Pick up ${name.toLowerCase()}`
  if (onBench(item) && toolboxLoanForSwollenGate(state) && !wrenLendsToolbox(state)) return 'Borrow the toolbox for the gate'
  return 'Pick up the toolbox'
}

// What a swimmer can reach: gear that floats.
export function floatingPickupOptions(state: Snapshot, player: Player) {
  return pickupOptions(state, player).filter(({ subject }) => subject !== undefined && floats(state.items[subject].kind))
}

export function pickupOptions(state: Snapshot, player: Player): InteractionOption<CargoAction>[] {
  const cargoWanted = wantsCargo(starterResidents, state)
  return state.items.filter((item) => canPickUp(state, item, player, cargoWanted))
    .sort((a, b) => distance(a, player) - distance(b, player))
    .map((item) => {
      const name = itemName(item.kind)
      const label = pickupLabel(state, item, name)
      // Gear packed close together in a vehicle bed gets smaller aim targets.
      const radius = item.kind === 'crate' ? crateTargetRadius : item.stowed ? stowedTargetRadius : toolTargetRadius
      return { action: 'pick-up' as const, subject: item.id, key: 'E', label, name, at: { x: item.x, y: item.y + (item.kind === 'crate' ? 0 : toolTargetLift), z: item.z }, radius }
    })
}
