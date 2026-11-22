import type { Item, Snapshot } from '../src/protocol.ts'
import type { Point } from '../src/world.ts'
import { groundHeight, walkingHeight, waterLevel } from '../src/terrain.ts'
import { crateHalfSize } from '../src/simulation/cargo.ts'
import { itemStarts, localPoint, offset } from '../src/world.ts'
import { carryPose, floats, isVehicleGear, stowedPose, uprightAtSide } from '../src/rescue-gear.ts'

export const heldCrateForwardM = 0.89
const heldCrateLiftM = 1.13
const crateWindupLiftM = 0.41
const heldToolboxLateralM = -0.43
const heldToolboxForwardM = 0.08
const heldToolboxLiftM = 0.36
const heldExtinguisherLateralM = -0.49
const heldExtinguisherForwardM = 0.59
const heldExtinguisherLiftM = 0.24
// Small gear is held out in the right hand, at chest height.
const heldGearLateralM = 0.32
const heldGearForwardM = 0.42
const heldGearLiftM = 0.95
// A ring buoy hangs upright from the left hand, clear of the legs.
const heldBuoyLateralM = -0.52
const heldBuoyForwardM = 0.06
const heldBuoyLiftM = 0.62

export const itemGroundClearance = 0.04

// Where an item rests at its home: on the ground, or on top of a bench for the toolbox.
export function restingY(id: number) {
  const entry = itemStarts[id]
  return 'lift' in entry ? groundHeight(entry.start) + entry.lift : itemGroundClearance
}

export function makeItems(): Item[] {
  return itemStarts.map(({ kind, start }, id) => ({
    ...start,
    id,
    heading: 0,
    kind,
    holder: null,
    onBed: false,
    delivered: false,
    spraying: false,
    y: restingY(id),
    rotation: null,
    ...('slot' in itemStarts[id] && { stowed: true }),
  }))
}

// A set-down item rests on the ground; a ring buoy or throw bag floats on water.
export function restingHeight(item: Pick<Item, 'kind' | 'x' | 'z'>) {
  const ground = walkingHeight(item) + itemGroundClearance
  return floats(item.kind) ? Math.max(ground, waterLevel) : ground
}

// Stowed gear rides in its slot on the Fire and Rescue pickup.
export function updateStowedItems(state: Pick<Snapshot, 'items' | 'vehicles'>) {
  for (const item of state.items) {
    if (!item.stowed || !isVehicleGear(item)) continue
    Object.assign(item, stowedPose(item, state.vehicles))
  }
}

export function updateHeldItems(state: Pick<Snapshot, 'items' | 'players'>) {
  for (const item of state.items) {
    if (item.holder === null) continue
    const holder = state.players.find((player) => player.id === item.holder)
    if (holder) {
      const pose = carryPose(item.kind)
      const winding = pose === 'crate' && holder.charge?.kind === 'throw' ? holder.charge.power : 0
      // A toolbox or ring buoy hangs from the relaxed left hand; an extinguisher is held out front.
      const [lateral, forward, lift] = item.kind === 'ring-buoy'
        ? [heldBuoyLateralM, heldBuoyForwardM, heldBuoyLiftM]
        : pose === 'crate'
          ? [0, heldCrateForwardM, heldCrateLiftM + winding * crateWindupLiftM]
          : pose === 'toolbox'
            ? [heldToolboxLateralM, heldToolboxForwardM, heldToolboxLiftM]
            : pose === 'tool' ? [heldGearLateralM, heldGearForwardM, heldGearLiftM] : [heldExtinguisherLateralM, heldExtinguisherForwardM, heldExtinguisherLiftM]
      item.rotation = item.kind === 'ring-buoy' ? uprightAtSide(holder.heading) : null
      Object.assign(item, offset(holder, lateral, forward))
      item.heading = holder.heading
      item.y = holder.y + lift
    }
  }
}

export function looseCargoTop(items: Item[], point: Point, margin: number) {
  let top = -Infinity
  for (const item of items) {
    if (item.kind !== 'crate' || item.holder !== null || item.delivered || item.onBed) continue
    const local = localPoint(item, point)
    const size = crateHalfSize + margin
    if (Math.abs(local.x) < size && Math.abs(local.z) < size) top = Math.max(top, item.y + crateHalfSize)
  }
  return top
}
