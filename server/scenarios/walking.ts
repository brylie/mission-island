import { walkingHeight } from '../../src/terrain.ts'
import { commuteCheckpoint, walkingCheckpoint, walkingLane } from '../../src/walking-scenario.ts'
import { daySeconds } from '../../src/weather.ts'
import { crateSize } from '../../src/world.ts'
import { standAt, type Scenario } from './scenario.ts'

export const walkingScenarios: Scenario[] = [
  {
    id: walkingCheckpoint, title: 'Seabrook · Walk, sprint and carry', island: 'Starter Island',
    prepareWorld(state) {
      state.islandTime = 2.25 * daySeconds
      const { crate } = walkingLane
      Object.assign(state.items[0], crate, { y: walkingHeight(crate) + crateSize / 2 })
    },
    placePlayer(player) {
      if (player.id === 0) standAt(player, walkingLane.start, walkingLane.heading)
      else standAt(player, walkingLane.observer, Math.PI)
    },
  },
  {
    id: commuteCheckpoint, title: 'Mara · Morning commute', island: 'Starter Island',
    prepareWorld(state) { state.islandTime = daySeconds - 12 },
    placePlayer(player) { standAt(player, { x: -37.2 + player.id, z: -33 }, -Math.PI / 4) },
  },
]
