import { careerUnlockXp, learnerVehicleIds, learnerVehicles, practiceStop, practiceStopRadiusM, practiceStopSpeedMps, practiceStopXp, type LearnerVehicleId } from '../src/learner-vehicles.ts'
import type { Player, Snapshot } from '../src/protocol.ts'
import { distance } from '../src/world.ts'
import type { CrewNotice } from './crew.ts'

// Each learner vehicle offers one practice stop at a time to the whole crew.
// Whoever is driving when it pulls up and stops there earns the career XP,
// so partners can take turns at the wheel and both progress.
export function createDrivingPractice(state: Snapshot, notifyAll: (notice: CrewNotice) => void, checkpoint?: () => void) {
  function arrive(id: LearnerVehicleId, driver: Player) {
    const vehicle = state.vehicles[id]
    const stop = practiceStop(id, state.practice[id])
    if (Math.abs(vehicle.speed) > practiceStopSpeedMps || distance(vehicle, stop) > practiceStopRadiusM) return
    const { career } = learnerVehicles[id]
    const before = driver.drivingXp?.[career] ?? 0
    const xp = before + practiceStopXp
    driver.drivingXp = { ...driver.drivingXp, [career]: xp }
    state.practice[id] = (state.practice[id] + 1) % learnerVehicles[id].stops.length
    notifyAll({ type: 'practice-run', vehicle: id, career, stop: stop.name, playerId: driver.id, xp, qualified: before < careerUnlockXp && xp >= careerUnlockXp })
    checkpoint?.()
  }

  return {
    tick(drivers: Partial<Record<LearnerVehicleId, Player>>) {
      for (const id of learnerVehicleIds) {
        const driver = drivers[id]
        if (driver) arrive(id, driver)
      }
    },
  }
}
