import type { ResidentDefinition } from '../../../residents/definition.ts'
import { bramRemarks } from './remarks.ts'
import { jobBoard } from '../../../jobs.ts'

const door = { x: -50, z: -18.9 }
// Far enough from the board that the reticle can tell the two apart.
const tally = { x: jobBoard.x + 2.5, z: jobBoard.z - .5 }
// A marked bay beside the depot, clear of Harbor Depot road and the crate yard.
export const stagingBay = { x: -52.5, z: -16 }

// Bram keeps the freight tally at Harbor Depot and lives above the depot office.
export const bram: ResidentDefinition = {
  id: 'bram',
  identity: { name: 'Bram', role: 'Harbor steward' },
  appearance: { look: { uniform: 'courier', skin: 'light', hair: 'short', hairColor: 'chestnut', hat: 'none' } },
  schedule: {
    home: { ...door, heading: 0 }, work: { ...tally, heading: -Math.PI / 2 },
    departs: 6.5, returns: 16.5, pace: 30,
    route: () => [door, { x: -46, z: -17.8 }, tally].map((point) => ({ point })),
  },
  remarks: bramRemarks,
  conversation: {
    lines({ state, kept }) {
      if (kept.includes('bram-staging')) {
        return ['“That staged load went out on time, and the road stayed clear. That’s how a yard should run.”',
          '“The ferry terminal needs new planks for the landing before any ferry can tie up. When the crew is ready, I’ll tally what it takes.”']
      }
      return [state.mission === 'complete' ? '“Morning. Bram, harbor steward. I keep the freight tally for the depot.”'
        : '“Bram, harbor steward. Your first delivery’s in the yard, three crates for Seabrook.”',
      '“The job board beside me lists the crew orders. I mark every load that leaves the yard.”']
    },
  },
  favors: [{
    id: 'bram-staging', title: 'Stage a load for Bram', coins: 5, trust: 1,
    kind: { cargo: 'crate', drop: stagingBay, radius: 1.4, place: 'the marked staging bay beside the depot' },
    available: (state) => state.mission === 'complete',
    offer: '“Tomorrow’s outgoing load needs staging. Could your crew set a crate in the marked bay beside the depot, off the road?”',
    reminder: '“One crate in the marked bay beside the depot. Keep the road clear while you work.”',
    detail: 'Bram needs one crate staged in the marked bay beside the depot.',
    next: 'Carry a crate from the freight yard and set it down in the yellow staging bay beside Harbor Depot. Keep Harbor Depot road clear.',
  }],
}
