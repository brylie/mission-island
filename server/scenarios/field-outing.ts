import { mara } from '../../src/worlds/starter/residents/mara.ts'
import { standAt, type Scenario } from './scenario.ts'

export const fieldOutingScenario: Scenario = {
  id: 'field-outing',
  title: 'Field outing · Mara’s clues at the fishing dock',
  island: 'Starter Island',
  prepareWorld(state) {
    // 07:30 gives the crew a dry first visit before the late-morning shower.
    state.islandTime = 30
  },
  placePlayer(player) {
    const { work } = mara.schedule
    standAt(player, { x: work.x + (player.id === 0 ? -0.4 : 0.45), z: work.z + 1.65 }, Math.PI)
  },
}
