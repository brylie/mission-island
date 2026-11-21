import { ferryStages } from '../../src/ferry-repair.ts'
import type { FerryLedger } from '../../src/ferry-repair.ts'
import type { Player, Snapshot } from '../../src/protocol.ts'
import { groundHeight } from '../../src/terrain.ts'
import { crateSize, ferryTerminal, offset } from '../../src/world.ts'
import type { Pose } from '../../src/world.ts'
import { yardDrop } from '../../src/worlds/starter/ferry-terminal.ts'
import { standAt, type Scenario } from './scenario.ts'

// A crew that has finished the starter shift and the four harbor orders that open the ferry repair.
function readyCrew(state: Snapshot) {
  state.mission = 'complete'
  state.fire = 0
  state.jobs = { active: null, completed: 4 }
  state.crewCoins = 14
  for (const item of state.items) if (item.kind === 'crate') item.delivered = true
}

function park(state: Snapshot, pose: Pose) {
  Object.assign(state.truck, pose)
}

// The crew waits beside the parked flatbed: one at the cab door, one at the tailgate.
function besideTruck(player: Player, state: Snapshot) {
  standAt(player, offset(state.truck, -1.9, player.id === 0 ? 1 : -2.2), state.truck.heading)
}

const finished = (i: number): FerryLedger => ({ coins: [ferryStages[i].coins - 4, 4], crates: [1, ferryStages[i].crates - 1] })

// The acceptance drive: the return road from Seabrook toward the harbor, before and after the repair.
const returnRoad: Pose = { x: 8, z: 10.6, heading: -2.21 }

export const ferryScenarios: Scenario[] = [
  {
    id: 'ferry-approach', title: 'Ferry · Find the ramp from the truck', island: 'Starter Island',
    prepareWorld(state) {
      readyCrew(state)
      park(state, returnRoad)
    },
    placePlayer: besideTruck,
  },
  {
    id: 'ferry-yard', title: 'Ferry · Stack the timber', island: 'Starter Island',
    prepareWorld(state) {
      readyCrew(state)
      state.ferryRepair = { stage: 1, ledger: [finished(0), { coins: [6, 6], crates: [0, 0] }], haul: 2 }
      park(state, { x: yardDrop.x + 1.5, z: yardDrop.z + 3.5, heading: 0 })
      for (const [i, crate] of state.items.filter(({ kind }) => kind === 'crate').slice(0, 2).entries()) {
        const point = offset(state.truck, i ? .7 : -.7, -4.6)
        Object.assign(crate, { ...point, y: groundHeight(point) + crateSize / 2 + .02, heading: 0, delivered: false, holder: null, onBed: false })
      }
    },
    placePlayer: besideTruck,
  },
  {
    id: 'ferry-restored', title: 'Ferry · Drive onto the open ramp', island: 'Starter Island',
    prepareWorld(state) {
      readyCrew(state)
      state.ferryRepair = { stage: ferryStages.length, ledger: ferryStages.map((_, i) => finished(i)), haul: 0, restoredAt: state.islandTime }
      park(state, { x: ferryTerminal.x, z: -16, heading: Math.PI })
    },
    placePlayer: besideTruck,
  },
]
