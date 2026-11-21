import { front, fenceZ, gateMendedStage, gateway } from '../../../gate-layout.ts'
import type { Leg, ScheduleTrait } from '../../../residents/definition.ts'
import { mendingBench, wrenCottage } from '../../../world.ts'

// Wren's day: home in the garden, the mending bench by the ferry freight yard from 07:00 to 17:00.
const gardenStandingDepth = 1.6
const doorClearance = 0.35
const laneClearance = 1.4
const benchStandingOffset = 1.3
const crossingX = -26.4
const crossingZ = -13.4
const westPathOffset = 4.6
const westPathExitOffset = 0.7
const shiftStartHour = 7
const shiftEndHour = 17
const walkingPace = 30
const half = 0.5

const home = { x: gateway.x, z: fenceZ + gardenStandingDepth }
const frontDoor = { x: gateway.x, z: front - doorClearance }
const backDoor = { x: gateway.x, z: wrenCottage.z + wrenCottage.d * half + doorClearance }
const lane = { x: gateway.x, z: fenceZ - laneClearance }
const work = { x: mendingBench.x - benchStandingOffset, z: mendingBench.z }
// Wren crosses Harbor Depot road just south of the fork, where drivers slow for the depot lane.
const roadToFerry = [{ point: { x: crossingX, z: crossingZ } }, { point: work }]
// The long way round: out the back door, between the Blue cottage and the fence, then down to the road.
const westPath = gateway.x - westPathOffset
const backCorner = { x: westPath, z: backDoor.z }
const backExit = { x: westPath, z: lane.z - westPathExitOffset }
const detour: Leg[] = [
  { point: home },
  { point: frontDoor },
  { point: backDoor, indoors: true },
  { point: backCorner },
  { point: backExit },
  ...roadToFerry,
]
// The worn route from the back door to the road, shown as stepping stones until the gate is mended.
export const backPath = [backDoor, backCorner, backExit]
const shortcut: Leg[] = [{ point: home }, { point: gateway }, { point: lane }, ...roadToFerry]

export const wrenSchedule: ScheduleTrait = {
  home: { ...home, heading: Math.PI },
  work: { ...work, heading: Math.PI * half },
  departs: shiftStartHour,
  returns: shiftEndHour,
  pace: walkingPace,
  // Once the mended gate has settled overnight, Wren takes the shortcut through it, unless the leaf has swollen shut.
  route: (state) => gateMendedStage(state) === 'settled' && state.gateRepair.swelling !== 'swollen' ? shortcut : detour,
}
