import type { Point } from '../../world.ts'

// The ferry freight yard opens off the east side of Harbor Depot road, just before the straight ramp lane.
// A flatbed can pull in from either direction, park parallel to the road and leave the lane clear.
export const ferryYard = { minX: -26.3, maxX: -16.5, minZ: -29.5, maxZ: -19.5 }

export function inFerryYard({ x, z }: Point, margin = 0) {
  return x > ferryYard.minX - margin && x < ferryYard.maxX + margin
    && z > ferryYard.minZ - margin && z < ferryYard.maxZ + margin
}

// The timber stack where hauled crates count toward the current repair stage.
export const yardDrop = { x: -21.5, z: -24, radius: 4 }

// The tally board stands at the yard's south-west corner beside the barrier and faces drivers on the straight.
export const tallyBoard = { x: -24.8, z: -30.1, heading: 0 }

// Seabrook's timber merchant stacks the ordered crates on the verge south of the main road, west of the beach trail.
// The flatbed can pull onto the verge, load, and drive back along Harbor Depot road to the ferry.
export const timberStack = { name: 'Seabrook timber stack', x: 20.8, z: 6.6 }
export const timberPickups: readonly Point[] = [-1.2, 0, 1.2].map((dx) => ({ x: timberStack.x + dx, z: timberStack.z }))

// The landing deck beyond the barrier, restored with the last repair stage. It rises gently out to the ferry berth,
// in segments shallow enough to walk and drive straight onto.
export const rampDeck = { near: -36, far: -46.8, nearTop: 0.02, farTop: 0.14, segments: 4 }
