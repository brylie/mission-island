import type { LearnerVehicleId } from '../src/learner-vehicles.ts'
import { learnerVehicleIds } from '../src/learner-vehicles.ts'
import type { Snapshot } from '../src/protocol.ts'
import type { createCargoPhysics, LearnerFleet } from '../src/simulation/cargo.ts'
import type { CrewMember, CrewNotice } from './crew.ts'
import { createDrivingPractice } from './driving-practice.ts'
import { updateStowedItems } from './items.ts'
import { createRescueGearUse } from './rescue-gear.ts'

// The Starter Island learner vehicles and the gear they carry, as one host
// feature: the game loop asks it for driver inputs before physics steps and
// hands control back after, so the rest of the loop stays vehicle-agnostic.
// The game creates it before the crew roster, so `notifyAll` is only called
// during ticks.
export function createLearnerFleet(
  state: Snapshot,
  physics: Pick<ReturnType<typeof createCargoPhysics>, 'parkLearner'>,
  notifyAll: (notice: CrewNotice) => void,
  checkpoint?: () => void,
) {
  const practice = createDrivingPractice(state, notifyAll, checkpoint)
  const gear = createRescueGearUse(state, notifyAll)
  let drivers: Partial<Record<LearnerVehicleId, CrewMember['player']>> = {}

  // Throttle comes only from active drivers. A parked driver sends no input but
  // still finishes a run by stopping in the ring, so every connected driver counts.
  function fleetStep(members: readonly CrewMember[], active: (member: CrewMember) => boolean): LearnerFleet {
    const inputs: LearnerFleet['inputs'] = {}
    drivers = {}
    for (const member of members) {
      const { vehicle, seat, connected } = member.player
      if (!vehicle || seat !== 'driver' || !connected) continue
      if (active(member)) inputs[vehicle] = member.input
      drivers[vehicle] = member.player
    }
    return { vehicles: state.vehicles, inputs }
  }

  function afterStep() {
    practice.tick(drivers)
    updateStowedItems(state)
  }

  // A checkpoint can arrange the vehicles, so physics follows the arranged poses.
  function park() {
    for (const id of learnerVehicleIds) state.vehicles[id] = physics.parkLearner(id, state.vehicles[id])
    updateStowedItems(state)
  }

  return { gear, fleetStep, afterStep, park, boarded: (member: CrewMember) => practice.boarded(member) }
}
