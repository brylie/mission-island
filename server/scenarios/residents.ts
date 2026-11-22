import { quarterTurnRadians } from '../../src/math/angles.ts'
import type { Snapshot } from '../../src/protocol.ts'
import { daySeconds, hoursPerDay } from '../../src/weather.ts'
import { bram } from '../../src/worlds/starter/residents/bram.ts'
import { standAt, type Scenario } from './scenario.ts'

const neighborRoundsHoursAfterDawn = 3.5
const crewWorkOffsetXM = 1.6
const firstCrewWorkOffsetZM = -0.8
const secondCrewWorkOffsetZM = 0.8
const crewStartingFish = 2
const crewStartingCarrots = 2

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
      state.islandTime = daySeconds * neighborRoundsHoursAfterDawn / hoursPerDay
    },
    placePlayer(player) {
      const { work } = bram.schedule
      standAt(player, { x: work.x - crewWorkOffsetXM, z: work.z + (player.id === 0 ? firstCrewWorkOffsetZM : secondCrewWorkOffsetZM) }, quarterTurnRadians)
      player.goods = { fish: crewStartingFish, carrots: crewStartingCarrots }
    },
  },
]
