import { front, fenceZ, gateMendedStage, gateway } from '../../../gate-layout.ts'
import type { Leg, ScheduleTrait } from '../../../residents/definition.ts'
import { mendingBench, wrenCottage } from '../../../world.ts'

// Wren's day: home in the garden, the mending bench by the ferry freight yard from 07:00 to 17:00.
const home = { x: gateway.x, z: fenceZ + 1.6 }
const frontDoor = { x: gateway.x, z: front - .35 }
const backDoor = { x: gateway.x, z: wrenCottage.z + wrenCottage.d / 2 + .35 }
const lane = { x: gateway.x, z: fenceZ - 1.4 }
const work = { x: mendingBench.x - 1.3, z: mendingBench.z }
// Wren crosses Harbor Depot road just south of the fork, where drivers slow for the depot lane.
const toFerry = [lane, { x: -26.4, z: -13.4 }, work]
// The long way round: out the back door, between the Blue cottage and the fence, then down to the road.
const westPath = gateway.x - 4.6
const detour: Leg[] = [
  { point: home }, { point: frontDoor }, { point: backDoor, indoors: true },
  { point: { x: westPath, z: backDoor.z } }, { point: { x: westPath, z: lane.z - .7 } },
  ...toFerry.slice(1).map((point) => ({ point })),
]
// The worn route from the back door to the road, shown as stepping stones until the gate is mended.
export const backPath = detour.slice(2, 5).map(({ point }) => point)
const shortcut: Leg[] = [{ point: home }, { point: gateway }, ...toFerry.map((point) => ({ point }))]

export const wrenSchedule: ScheduleTrait = {
  home: { ...home, heading: Math.PI },
  work: { ...work, heading: Math.PI / 2 },
  departs: 7, returns: 17, pace: 30,
  // Once the mended gate has settled overnight, Wren takes the shortcut through it.
  route: (state) => gateMendedStage(state) === 'settled' ? shortcut : detour,
}
