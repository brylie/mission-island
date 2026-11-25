import { careerUnlockXp, freshPracticeTour, learnerVehicleIds, learnerVehicles, practiceStop, practiceStopRadiusM, practiceStopSpeedMps, practiceStopXp, practiceTourFinished, practiceTourUnstarted, type LearnerVehicleId } from '../src/learner-vehicles.ts'
import type { PracticeTourAction } from '../src/interactions/practice-tour.ts'
import type { Player, Snapshot } from '../src/protocol.ts'
import { distance } from '../src/world.ts'
import type { CrewMember, CrewNotice } from './crew.ts'
import type { InteractionHandlers } from './interactions.ts'

// Each learner vehicle offers one practice tour at a time to the whole crew. Whoever
// is driving when it pulls up and stops at the next stop earns the career XP, so
// partners can take turns at the wheel and both progress. The tour visits each stop
// once; after the last one it ends with a summary of what each driver earned and
// stays finished, even across a host restart, until a crewmate starts it again on purpose.
export function createDrivingPractice(state: Snapshot, notifyAll: (notice: CrewNotice) => void, checkpoint?: () => void) {
  function arrive(id: LearnerVehicleId, driver: Player) {
    const vehicle = state.vehicles[id]
    const stop = practiceStop(id, state.practice[id])
    if (!stop || Math.abs(vehicle.speed) > practiceStopSpeedMps || distance(vehicle, stop) > practiceStopRadiusM) return
    const { career, stops } = learnerVehicles[id]
    const before = driver.drivingXp?.[career] ?? 0
    const xp = before + practiceStopXp
    const qualified = before < careerUnlockXp && xp >= careerUnlockXp
    driver.drivingXp = { ...driver.drivingXp, [career]: xp }
    const tour = state.practiceTours[id]
    const earning = tour.earned.find((entry) => entry.playerId === driver.id)
    if (earning) earning.xp += practiceStopXp
    else tour.earned.push({ playerId: driver.id, xp: practiceStopXp })
    if (qualified) tour.qualified.push(driver.id)
    state.practice[id] += 1
    const finished = practiceTourFinished(id, state.practice[id])
      ? { stops: stops.length, earned: structuredClone(tour.earned), qualified: [...tour.qualified] }
      : undefined
    notifyAll({ type: 'practice-run', vehicle: id, career, stop: stop.name, playerId: driver.id, xp, qualified, ...(finished && { finished }) })
    checkpoint?.()
  }

  return {
    tick(drivers: Partial<Record<LearnerVehicleId, Player>>) {
      for (const id of learnerVehicleIds) {
        const driver = drivers[id]
        if (driver) arrive(id, driver)
      }
    },
    // A crewmate who boards before the tour's first stop hears what the tour is.
    boarded(member: CrewMember) {
      const id = member.player.vehicle
      if (!id || !practiceTourUnstarted(state.practice[id], state.practiceTours[id])) return
      member.notify?.({ type: 'practice-tour', event: 'intro', vehicle: id, stops: learnerVehicles[id].stops.length })
    },
  }
}

// E beside a stopped vehicle whose tour is finished starts it again at its first stop.
// The interaction list only offers it then, and the host checks the list first. The
// game saves after every interaction, as it does after this one.
export function practiceTourHandlers(state: Snapshot, notifyAll: (notice: CrewNotice) => void): InteractionHandlers<PracticeTourAction> {
  return {
    'restart-practice-tour': ({ player }, subject) => {
      const id = learnerVehicleIds[subject]
      if (!id || !practiceTourFinished(id, state.practice[id])) return
      state.practice[id] = 0
      state.practiceTours[id] = freshPracticeTour(id)
      notifyAll({ type: 'practice-tour', event: 'restarted', vehicle: id, playerId: player.id })
    },
  }
}
