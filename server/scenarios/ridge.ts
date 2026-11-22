import { daySeconds, hoursPerDay, weatherAt } from '../../src/weather.ts'
import { offset } from '../../src/world.ts'
import { ridgeHeading, ridgeLaunch, ridgeMeadow } from '../../src/worlds/starter/ridge-scout.ts'
import { standAt, type Scenario } from './scenario.ts'

const signLateralM = 5.55
const signBehindM = -8
const schoolFlightDayOffset = 2
const schoolFlightHoursAfterDawn = 4.5
const spectatorLateralM = -1.4
const spectatorBehindM = -0.8

// The pilot starts at the rack facing the meadow. A second player starts beside the landing sign to spot.
const besideSign = offset({ ...ridgeMeadow, heading: ridgeHeading }, signLateralM, signBehindM)

export const ridgeScenarios: Scenario[] = [
  {
    id: 'ridge-checkout',
    title: 'Windstone Ridge · Glider checkout',
    island: 'Starter Island',
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
  {
    id: 'ridge-soaring',
    title: 'Windstone Ridge · Soar the island',
    island: 'Starter Island',
    prepareWorld(state) {
      state.mission = 'complete'
      state.fire = 0
      // A dry late morning on the third day, when the thermals are building.
      state.islandTime = daySeconds * schoolFlightDayOffset + daySeconds * schoolFlightHoursAfterDawn / hoursPerDay
      state.weather = weatherAt(state.islandTime)
      state.aviation = { qualified: true, surveyed: true, aerial: [], marked: false, flight: null }
    },
    placePlayer(player) {
      if (player.id === 0) standAt(player, ridgeLaunch, ridgeHeading)
      else standAt(player, offset({ ...ridgeLaunch, heading: ridgeHeading }, spectatorLateralM, spectatorBehindM), ridgeHeading)
    },
  },
]
