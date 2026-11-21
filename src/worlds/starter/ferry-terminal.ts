import type { Point } from '../../world.ts'

// The ferry freight yard opens off the east side of Harbor Depot road, just before the straight ramp lane.
// A flatbed can pull in from either direction, park parallel to the road and leave the lane clear.
export const ferryYard = { minX: -26.3, maxX: -16.5, minZ: -29.5, maxZ: -19.5 }

export function inFerryYard({ x, z }: Point, margin = 0) {
  return x > ferryYard.minX - margin && x < ferryYard.maxX + margin &&
    z > ferryYard.minZ - margin && z < ferryYard.maxZ + margin
}

// The timber stack where hauled crates count toward the current repair stage.
export const yardDrop = { x: -21.5, z: -24, radius: 4 }

// The tally board stands at the yard's south-west corner beside the barrier and faces drivers on the straight.
export const tallyBoard = { x: -24.8, z: -30.1, heading: 0 }
