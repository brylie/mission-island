import { learnerVehicles, type LearnerVehicleId } from '../../src/learner-vehicles.ts'
import { offset } from '../../src/world.ts'
import { standAt, type Scenario } from './scenario.ts'

const doorStandoffM = 0.3
const half = 0.5
const quarterTurn = Math.PI * half

// The first player stands at the driver's door and the second at the
// opposite side, ready to ride along or watch the first practice stop.
function learnerScenario(id: LearnerVehicleId, title: string): Scenario {
  const vehicle = learnerVehicles[id]
  return {
    id: `learner-${id}`,
    title,
    island: 'Starter Island',
    prepareWorld(state) {
      state.mission = 'complete'
      state.fire = 0
      state.practice[id] = 0
    },
    placePlayer(player) {
      const [driverDoor, otherDoor] = vehicle.exits
      const door = player.id === 0 ? driverDoor : otherDoor
      const side = Math.sign(door.x)
      standAt(player, offset(vehicle.park, door.x + side * doorStandoffM, door.z), vehicle.park.heading - side * quarterTurn)
    },
  }
}

export const learnerScenarios: Scenario[] = [
  learnerScenario('pickup', 'Learner driving · Fire and Rescue pickup'),
  learnerScenario('tractor', 'Learner driving · Island Farm tractor'),
]
