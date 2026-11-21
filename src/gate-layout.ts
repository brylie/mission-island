import type { Snapshot } from './protocol.ts'
import { dawnsBetween } from './weather.ts'
import { wrenCottage } from './world.ts'
import type { Point } from './world.ts'

// Wren's front garden. The fence is taller than a jump, so the gate is the only way in.
const fenceSetback = 2.35
const gardenHalfWidth = 2.6
const sideFenceOverlap = 0.7
const postClearance = 0.06
const leafLength = 1.06
const leafHeight = 1.5
const leafThickness = 0.08
const gatewayHalfWidth = 0.55
const half = 0.5

export const front = wrenCottage.z - wrenCottage.d * half
export const fenceZ = front - fenceSetback
export const fenceHeight = 1.55
export const gateway: Point = { x: wrenCottage.x, z: fenceZ }
export const hingePost: Point = { x: gateway.x - gatewayHalfWidth, z: fenceZ }
export const gateLeaf = { length: leafLength, height: leafHeight, thickness: leafThickness }
export const mendingPinHeight = 0.95

const west = wrenCottage.x - gardenHalfWidth
const east = wrenCottage.x + gardenHalfWidth
const sideFenceEnd = front + sideFenceOverlap
export const fenceRuns = [
  { from: { x: west, z: sideFenceEnd }, to: { x: west, z: fenceZ } },
  { from: { x: east, z: sideFenceEnd }, to: { x: east, z: fenceZ } },
  { from: { x: west, z: fenceZ }, to: { x: hingePost.x - postClearance, z: fenceZ } },
  { from: { x: gateway.x + gatewayHalfWidth + postClearance, z: fenceZ }, to: { x: east, z: fenceZ } },
]

type MendedStage = 'broken' | 'fixed-today' | 'settled'
export function gateMendedStage({ gateRepair, islandTime }: Pick<Snapshot, 'gateRepair' | 'islandTime'>): MendedStage {
  if (gateRepair.stage !== 'mended' || gateRepair.mendedAt === undefined) return 'broken'
  return dawnsBetween(gateRepair.mendedAt, islandTime) < 1 ? 'fixed-today' : 'settled'
}
