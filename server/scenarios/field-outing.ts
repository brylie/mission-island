import { mara } from '../../src/worlds/starter/residents/mara.ts'
import { standAt, type Scenario } from './scenario.ts'

const fieldOutingSeconds = 30
const firstCrewLateralM = -0.4
const secondCrewLateralM = 0.45
const crewDockSetbackM = 1.65

export const fieldOutingScenario: Scenario = {
  id: 'field-outing',
  title: 'Field outing · Mara’s clues at the fishing dock',
  island: 'Starter Island',
  prepareWorld(state) {
    // 07:30 gives the crew a dry first visit before the late-morning shower.
    state.islandTime = fieldOutingSeconds
  },
  placePlayer(player) {
    const { work } = mara.schedule
    standAt(player, { x: work.x + (player.id === 0 ? firstCrewLateralM : secondCrewLateralM), z: work.z + crewDockSetbackM }, Math.PI)
  },
}
