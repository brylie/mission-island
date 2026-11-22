import { drivingCareers, learnerVehicleIds, seatOffset } from '../src/learner-vehicles.ts'
import { itemStarts } from '../src/world.ts'
import { makeItems } from './items.ts'
import { saveVersions } from './save-version.ts'

// Saving and loading the Starter Island learner fleet and its rescue gear,
// kept apart from the shared save rules so new features add their own module.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

const isCount = (value: unknown) => isNumber(value) && Number.isSafeInteger(value) && value >= 0
const isPose = (value: unknown) => isRecord(value) && [value.x, value.z, value.heading].every(isNumber)
const isLearnerId = (id: unknown) => learnerVehicleIds.some((known) => known === id)

// Version 8 adds the Fire and Rescue pickup's gear to the item list, stowed in
// its bed. It runs after the Fire Watch migration, which already fills in every
// missing item from older saves, so a version 7 save only lacks the gear.
export function migrateRescueGear(value: unknown): unknown {
  if (!isRecord(value) || value.version !== saveVersions.fireWatch || !isRecord(value.world) || !Array.isArray(value.world.items)) return value
  const saved: unknown[] = value.world.items
  const items = [...saved, ...makeItems().slice(saved.length)]
  return { ...value, version: saveVersions.rescueGear, world: { ...value.world, items } }
}

// Learner fleet records are optional, so saves from before the fleet still load.
export function isSavedLearnerFleet(world: Record<string, unknown>) {
  const { vehicles, practice } = world
  return (vehicles === undefined || (isRecord(vehicles) && Object.entries(vehicles).every(([id, pose]) => isLearnerId(id) && isPose(pose))))
    && (practice === undefined || (isRecord(practice) && Object.entries(practice).every(([id, stop]) => isLearnerId(id) && isCount(stop))))
}

// A crewmate's career driving XP, and a learner vehicle only with a seat that vehicle has.
export function isSavedLearnerPlayer(player: Record<string, unknown>) {
  const { drivingXp, vehicle, seat } = player
  const xp = drivingXp === undefined || (isRecord(drivingXp) && Object.entries(drivingXp).every(([career, value]) => Object.hasOwn(drivingCareers, career) && isCount(value)))
  if (!xp || vehicle === undefined) return xp
  const id = learnerVehicleIds.find((known) => known === vehicle)
  return id !== undefined && (seat === 'driver' || seat === 'passenger') && seatOffset(id, seat) !== undefined
}

// Only vehicle gear can be stowed.
export function isSavedGear(item: Record<string, unknown>, id: number) {
  return item.stowed === undefined || (item.stowed === true && 'slot' in itemStarts[id])
}
