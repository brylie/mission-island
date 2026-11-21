import { offset } from '../../src/world.ts'
import { ridgeHeading, ridgeLaunch, ridgeMeadow } from '../../src/worlds/starter/ridge-scout.ts'
import { standAt, type Scenario } from './scenario.ts'

// The pilot starts at the rack facing the meadow. A second player starts beside the landing sign to spot.
const besideSign = offset({ ...ridgeMeadow, heading: ridgeHeading }, 5.55, -8)

export const ridgeScenarios: Scenario[] = [
  {
    id: 'ridge-checkout', title: 'Windstone Ridge · Glider checkout', island: 'Starter Island',
    prepareWorld(state) {
      state.mission = 'complete'
      state.fire = 0
      state.aviation = { qualified: false, surveyed: false, marked: false, flight: null }
    },
    placePlayer(player) {
      if (player.id === 0) standAt(player, ridgeLaunch, ridgeHeading)
      else standAt(player, besideSign, ridgeHeading + Math.PI)
    },
  },
]
