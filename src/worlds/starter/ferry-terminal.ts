import type { Point } from '../../world.ts'

// The ferry freight yard opens off the east side of Harbor Depot road, just before the straight ramp lane.
// A flatbed can pull in from either direction, park parallel to the road and leave the lane clear.
const yardWest = -26.3
const yardEast = -16.5
const yardSouth = -29.5
const yardNorth = -19.5
export const ferryYard = { minX: yardWest, maxX: yardEast, minZ: yardSouth, maxZ: yardNorth }

export function inFerryYard({ x, z }: Point, margin = 0) {
  return x > ferryYard.minX - margin && x < ferryYard.maxX + margin
    && z > ferryYard.minZ - margin && z < ferryYard.maxZ + margin
}

// The timber stack where hauled crates count toward the current repair stage.
const yardDropX = -21.5
const yardDropZ = -24
const yardDropRadius = 4
export const yardDrop = { x: yardDropX, z: yardDropZ, radius: yardDropRadius }

// The tally board stands at the yard's south-west corner beside the barrier and faces drivers on the straight.
const tallyBoardX = -24.8
const tallyBoardZ = -30.1
export const tallyBoard = { x: tallyBoardX, z: tallyBoardZ, heading: 0 }
export const tallyControlOffsetX = 0.85
export const timberSlipHeight = 1.15

// Seabrook's timber merchant stacks the ordered crates on the verge south of the main road, west of the beach trail.
// The flatbed can pull onto the verge, load, and drive back along Harbor Depot road to the ferry.
const timberStackX = 20.8
const timberStackZ = 6.6
const timberPickupSpacing = 1.2
export const timberStack = { name: 'Seabrook timber stack', x: timberStackX, z: timberStackZ }
export const timberPickups: readonly Point[] = [-timberPickupSpacing, 0, timberPickupSpacing].map((dx) => ({ x: timberStack.x + dx, z: timberStack.z }))

// The landing deck beyond the barrier, restored with the last repair stage. It rises gently out to the ferry berth,
// in segments shallow enough to walk and drive straight onto.
const rampNearZ = -36
const rampFarZ = -46.8
const rampNearTop = 0.02
const rampFarTop = 0.14
const rampSegments = 4
export const rampDeck = { near: rampNearZ, far: rampFarZ, nearTop: rampNearTop, farTop: rampFarTop, segments: rampSegments }

const barrierThickness = 0.24
const barrierHeight = 1.12
export const ferryBarrier = { thickness: barrierThickness, height: barrierHeight }
