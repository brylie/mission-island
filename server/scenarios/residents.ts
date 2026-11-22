import { quarterTurnRadians } from '../../src/math/angles.ts'
import type { Snapshot } from '../../src/protocol.ts'
import { secondsAtIslandHour } from '../../src/residents/schedule.ts'
import { bram } from '../../src/worlds/starter/residents/bram.ts'
import { mara } from '../../src/worlds/starter/residents/mara.ts'
import { wren } from '../../src/worlds/starter/residents/wren.ts'
import { standAt, type Scenario } from './scenario.ts'

const neighborRoundsHour = 9.5
const crewWorkOffsetXM = 1.6
const firstCrewWorkOffsetZM = -0.8
const secondCrewWorkOffsetZM = 0.8
const crewStartingFish = 2
const crewStartingCarrots = 2
const householdPorchVisitHour = 18.5
const porchViewOffsetX = 1.6
const porchViewOffsetZ = 1.2

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
      state.islandTime = secondsAtIslandHour(neighborRoundsHour)
    },
    placePlayer(player) {
      const { work } = bram.schedule
      standAt(player, { x: work.x - crewWorkOffsetXM, z: work.z + (player.id === 0 ? firstCrewWorkOffsetZM : secondCrewWorkOffsetZM) }, quarterTurnRadians)
      player.goods = { fish: crewStartingFish, carrots: crewStartingCarrots }
    },
  },
  {
    id: 'household-evening',
    title: 'Residents · Evening at Mara’s and Wren’s homes',
    island: 'Starter Island',
    prepareWorld(state) {
      state.mission = 'complete'
      state.fire = 0
      state.islandTime = secondsAtIslandHour(householdPorchVisitHour)
    },
    placePlayer(player) {
      const { home } = (player.id === 0 ? mara : wren).schedule
      standAt(player, { x: home.x + porchViewOffsetX, z: home.z - porchViewOffsetZ }, Math.atan2(-porchViewOffsetX, porchViewOffsetZ))
      player.goods.carrots = crewStartingCarrots
    },
  },
]
