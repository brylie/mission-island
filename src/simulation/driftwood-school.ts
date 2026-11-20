import { inSkiff } from '../actions.ts'
import { coastPoint, waterDepth, waterLevel } from '../terrain.ts'
import type { Player, Skiff } from '../protocol.ts'
import { createCoastalSchool, type CoastalSchoolFrame } from './coastal-school.ts'
import type { SchoolThreat } from './fish-school.ts'

// Offshore from the middle Driftwood parasol, where the wading shelf meets open water.
export const driftwoodShallows = coastPoint(-1.08, 1.054)

export function createDriftwoodSchool(seed: number) {
  const school = createCoastalSchool(seed, driftwoodShallows, waterDepth)
  function step(players: readonly Player[], skiff?: Skiff) {
    const threats: SchoolThreat[] = []
    for (const p of players) {
      if (p.connected && !p.sleeping && !p.seat && (p.swimming || (p.y <= waterLevel + .08 && waterDepth(p) > .04))) {
        threats.push({ x: p.x, z: p.z, range: 1.9 })
      }
    }
    // Riders disturb the water once, through the hull.
    if (skiff && (Math.abs(skiff.speed) > .12 || players.some(p => p.connected && inSkiff(p.seat)))) {
      threats.push({ x: skiff.x, z: skiff.z, range: 2.9 })
    }
    school.step(threats)
    return school.frame()
  }
  return { step, frame: school.frame }
}
export type DriftwoodFrame = CoastalSchoolFrame
