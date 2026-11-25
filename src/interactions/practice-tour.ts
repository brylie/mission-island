import { atDriverDoor, besideStoppedLearner, learnerVehicleIds, learnerVehicles, practiceTourFinished, seatOffset } from '../learner-vehicles.ts'
import type { Player, Snapshot } from '../protocol.ts'
import { offset } from '../world.ts'
import type { InteractionOption, InteractionPolicies } from './definition.ts'

// A finished practice tour starts again only when a crewmate chooses to: on foot,
// beside the stopped vehicle, with E. The subject is the vehicle's index in
// `learnerVehicleIds`. At the driver's door it is the first thing E does, with no aim
// needed, so keyboard-only players can start it; anywhere else beside the vehicle it
// comes last, so E at the bed still takes gear and E at a fire station still refills,
// and the reticle on the cab picks it.
const cabAimRadiusM = 0.8
const cabAimLiftM = 0.4

export const practiceTourActions = {
  'restart-practice-tour': 'default',
} as const satisfies InteractionPolicies
export type PracticeTourAction = keyof typeof practiceTourActions

function restartOptions(state: Snapshot, player: Player): (InteractionOption<PracticeTourAction> & { atDoor: boolean })[] {
  return learnerVehicleIds.flatMap((id, subject) => {
    const vehicle = state.vehicles[id]
    const seat = seatOffset(id, 'driver')
    if (!seat || !practiceTourFinished(id, state.practice[id]) || !besideStoppedLearner(vehicle, player)) return []
    const { name, noun } = learnerVehicles[id]
    const cab = offset(vehicle, seat.x, seat.z)
    return [{
      action: 'restart-practice-tour' as const,
      subject,
      key: 'E',
      label: `Start the ${noun} practice tour again`,
      name,
      at: { ...cab, y: vehicle.y + seat.y + cabAimLiftM },
      radius: cabAimRadiusM,
      atDoor: atDriverDoor(id, vehicle, player),
    }]
  })
}

// The restart at the driver's door comes first in the interaction list, and anywhere else last.
export function practiceTourInteractions(state: Snapshot, player: Player) {
  const options = restartOptions(state, player).map(({ atDoor, ...option }) => ({ option, atDoor }))
  return {
    first: options.filter(({ atDoor }) => atDoor).map(({ option }) => option),
    last: options.filter(({ atDoor }) => !atDoor).map(({ option }) => option),
  }
}
