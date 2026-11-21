import type { Snapshot } from '../../src/protocol.ts'
import { daySeconds } from '../../src/weather.ts'
import { bram } from '../../src/worlds/starter/residents/bram.ts'
import { standAt, type Scenario } from './scenario.ts'

// Mid-morning after the starter shift, with Bram at the tally board. Each crewmate carries enough
// to keep Mara's and Ines's favors, so one session can try all three and hear the greetings change.
export const residentScenarios: Scenario[] = [
  {
    id: 'village-favors',
    title: 'Residents · Favors for Mara, Ines and Bram',
    island: 'Starter Island',
    prepareWorld(state: Snapshot) {
      state.mission = 'complete'
      state.fire = 0
      state.islandTime = daySeconds * 3.5 / 24
    },
    placePlayer(player) {
      const { work } = bram.schedule
      standAt(player, { x: work.x - 1.6, z: work.z + (player.id === 0 ? -0.8 : 0.8) }, Math.PI / 2)
      player.goods = { fish: 2, carrots: 2 }
    },
  },
]
