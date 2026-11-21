import type { Snapshot } from './protocol.ts'
import { dawnsBetween } from './weather.ts'
import { wrenCottage } from './world.ts'
import type { Point } from './world.ts'

// Wren's front garden. The fence is taller than a jump, so the gate is the only way in.
export const front = wrenCottage.z - wrenCottage.d / 2
export const fenceZ = front - 2.35
export const fenceHeight = 1.55
export const gateway: Point = { x: wrenCottage.x, z: fenceZ }
export const gateWidth = 1.1
export const hingePost: Point = { x: gateway.x - gateWidth / 2, z: fenceZ }

type MendedStage = 'broken' | 'fixed-today' | 'settled'
export function gateMendedStage({ gateRepair, islandTime }: Pick<Snapshot, 'gateRepair' | 'islandTime'>): MendedStage {
  if (gateRepair.stage !== 'mended' || gateRepair.mendedAt === undefined) return 'broken'
  return dawnsBetween(gateRepair.mendedAt, islandTime) < 1 ? 'fixed-today' : 'settled'
}
