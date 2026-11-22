import { ferryStages } from '../../src/ferry-repair.ts'
import type { FerryLedger } from '../../src/ferry-repair.ts'
import type { Player, Snapshot } from '../../src/protocol.ts'
import { groundHeight } from '../../src/terrain.ts'
import { secondIslandGoal } from '../../src/jobs.ts'
import { crateHalfSize } from '../../src/simulation/cargo.ts'
import { ferryTerminal, offset } from '../../src/world.ts'
import type { Pose } from '../../src/world.ts'
import { yardDrop } from '../../src/worlds/starter/ferry-terminal.ts'
import { standAt, type Scenario } from './scenario.ts'

const availableCrewCoins = 14
const cabSideLateralM = -1.9
const tailgateForwardM = -2.2
const finishedPartnerDonationCoins = 4
const returnRoadX = 8
const returnRoadZ = 10.6
const returnRoadHeadingRad = -2.21
const yardStage = 1
const yardTimberCrates = ferryStages[yardStage].crates
const yardCrewDonationCoins = 6
const yardTruckOffsetXM = 1.5
const yardTruckOffsetZM = 3.5
const stagedCrateRightM = 0.7
const stagedCrateLeftM = -0.7
const stagedCrateRearM = -4.6
const stagedCrateClearanceM = 0.02
const restoredRampApproachZ = -16

// A crew that has finished the starter shift and the four harbor orders that open the ferry repair.
function readyCrew(state: Snapshot) {
  state.mission = 'complete'
  state.fire = 0
  state.jobs = { active: null, completed: secondIslandGoal }
  state.crewCoins = availableCrewCoins
  for (const item of state.items) if (item.kind === 'crate') item.delivered = true
}

function park(state: Snapshot, pose: Pose) {
  Object.assign(state.truck, pose)
}

// The crew waits beside the parked flatbed: one at the cab door, one at the tailgate.
function besideTruck(player: Player, state: Snapshot) {
  standAt(player, offset(state.truck, cabSideLateralM, player.id === 0 ? 1 : tailgateForwardM), state.truck.heading)
}

const finished = (i: number): FerryLedger => ({ coins: [ferryStages[i].coins - finishedPartnerDonationCoins, finishedPartnerDonationCoins], crates: [1, ferryStages[i].crates - 1] })

// The acceptance drive: the return road from Seabrook toward the harbor, before and after the repair.
const returnRoad: Pose = { x: returnRoadX, z: returnRoadZ, heading: returnRoadHeadingRad }

export const ferryScenarios: Scenario[] = [
  {
    id: 'ferry-approach',
    title: 'Ferry · Find the ramp from the truck',
    island: 'Starter Island',
    prepareWorld(state) {
      readyCrew(state)
      park(state, returnRoad)
    },
    placePlayer: besideTruck,
  },
  {
    id: 'ferry-yard',
    title: 'Ferry · Stack the timber',
    island: 'Starter Island',
    prepareWorld(state) {
      readyCrew(state)
      state.ferryRepair = { stage: yardStage, ledger: [finished(0), { coins: [yardCrewDonationCoins, yardCrewDonationCoins], crates: [0, 0] }], haul: yardTimberCrates }
      park(state, { x: yardDrop.x + yardTruckOffsetXM, z: yardDrop.z + yardTruckOffsetZM, heading: 0 })
      for (const [i, crate] of state.items.filter(({ kind }) => kind === 'crate').slice(0, yardTimberCrates).entries()) {
        const point = offset(state.truck, i ? stagedCrateRightM : stagedCrateLeftM, stagedCrateRearM)
        Object.assign(crate, { ...point, y: groundHeight(point) + crateHalfSize + stagedCrateClearanceM, heading: 0, delivered: false, holder: null, onBed: false })
      }
    },
    placePlayer: besideTruck,
  },
  {
    id: 'ferry-restored',
    title: 'Ferry · Drive onto the open ramp',
    island: 'Starter Island',
    prepareWorld(state) {
      readyCrew(state)
      state.ferryRepair = { stage: ferryStages.length, ledger: ferryStages.map((_, i) => finished(i)), haul: 0, restoredAt: state.islandTime }
      park(state, { x: ferryTerminal.x, z: restoredRampApproachZ, heading: Math.PI })
    },
    placePlayer: besideTruck,
  },
]
