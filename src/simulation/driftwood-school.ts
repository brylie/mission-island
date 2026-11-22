import { inSkiff } from '../actions.ts'
import { coastPoint, waterDepth, waterLevel } from '../terrain.ts'
import type { Player, Skiff } from '../protocol.ts'
import { createCoastalSchool, type CoastalSchoolFrame } from './coastal-school.ts'
import type { SchoolThreat } from './fish-school.ts'

const schoolBearingRad = -1.08
const schoolCoastRadiusRatio = 1.054
const waderSurfaceLeewayM = 0.08
const waderMinimumDepthM = 0.04
const swimmerDisturbanceRadiusM = 1.9
const paddlingSpeedThresholdMps = 0.12
const skiffDisturbanceRadiusM = 2.9

// Offshore from the middle Driftwood parasol, where the wading shelf meets open water.
export const driftwoodShallows = coastPoint(schoolBearingRad, schoolCoastRadiusRatio)

export function createDriftwoodSchool(seed: number) {
  const school = createCoastalSchool(seed, driftwoodShallows, waterDepth)
  function step(players: readonly Player[], skiff?: Skiff) {
    const threats: SchoolThreat[] = []
    for (const p of players) {
      if (p.connected && !p.sleeping && !p.seat && (p.swimming || (p.y <= waterLevel + waderSurfaceLeewayM && waterDepth(p) > waderMinimumDepthM))) {
        threats.push({ x: p.x, z: p.z, range: swimmerDisturbanceRadiusM })
      }
    }
    // Riders disturb the water once, through the hull.
    if (skiff && (Math.abs(skiff.speed) > paddlingSpeedThresholdMps || players.some((p) => p.connected && inSkiff(p.seat)))) {
      threats.push({ x: skiff.x, z: skiff.z, range: skiffDisturbanceRadiusM })
    }
    school.step(threats)
    return school.frame()
  }
  return { step, frame: school.frame }
}
export type DriftwoodFrame = CoastalSchoolFrame
