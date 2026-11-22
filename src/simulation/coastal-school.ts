import type { Point } from '../world.ts'
import { advanceSchool, createSchool, poolRadius, schoolIsRegrouping, threatBuffer, type SchoolThreat, type SwimHabitat } from './fish-school.ts'

const minimumSwimDepthM = 0.48
const shoreProbeSeconds = 0.65
const shallowWaterDepthM = 0.95
const shallowsRepulsionGain = 6
const maximumDeepWaterPush = 0.8
const deepWaterDepthM = 1.45
const deepWaterReturnGain = 1.3
const slopeProbeM = 0.4
const minimumDepthGradient = 0.01
const spawnDepthAttempts = 12
const spawnRadiusShrink = 0.75
const snapshotPrecision = 1000

export function createCoastalSchool(seed: number, origin: Point, waterDepth: (point: Point) => number) {
  const toWorld = (p: Point) => ({ x: origin.x + p.x, z: origin.z + p.z })
  const depth = (p: Point) => waterDepth(toWorld(p))
  const habitat: SwimHabitat = {
    // Leave room above the bed for the head and tail, including on a slope.
    navigable: (p) => depth(p) >= minimumSwimDepthM,
    steer(p, vx, vz) {
      const d = depth({ x: p.x + vx * shoreProbeSeconds, z: p.z + vz * shoreProbeSeconds })
      const shallow = Math.max(0, shallowWaterDepthM - d) * shallowsRepulsionGain
      const deep = Math.min(maximumDeepWaterPush, Math.max(0, d - deepWaterDepthM) * deepWaterReturnGain)
      if (!shallow && !deep) return { x: 0, z: 0 }
      const dx = depth({ x: p.x + slopeProbeM, z: p.z }) - depth({ x: p.x - slopeProbeM, z: p.z })
      const dz = depth({ x: p.x, z: p.z + slopeProbeM }) - depth({ x: p.x, z: p.z - slopeProbeM })
      const scale = (shallow - deep) / Math.max(minimumDepthGradient, Math.hypot(dx, dz))
      return { x: dx * scale, z: dz * scale }
    },
  }
  const school = createSchool(seed)
  for (const fish of school.fish) {
    // Seeds can straddle the waterline. Pull those fish in toward the authored wet origin.
    for (let attempt = 0; attempt < spawnDepthAttempts && !habitat.navigable(fish); attempt++) {
      fish.x *= spawnRadiusShrink
      fish.z *= spawnRadiusShrink
    }
  }
  function step(threats: readonly SchoolThreat[]) {
    const nearby = threats.flatMap(({ x, z, range }) => {
      const dx = x - origin.x, dz = z - origin.z
      return Math.hypot(dx, dz) < poolRadius + range + threatBuffer ? [{ x: dx, z: dz, range }] : []
    })
    advanceSchool(school, nearby, habitat)
  }
  const round = (n: number) => Math.round(n * snapshotPrecision) / snapshotPrecision
  function frame() {
    return {
      leader: school.leader,
      regrouping: schoolIsRegrouping(school),
      fish: school.fish.map((f) => {
        const { x, z } = toWorld(f)
        return { x: round(x), z: round(z), heading: round(f.heading), startled: f.alarm > 0 }
      }),
    }
  }
  return { step, frame }
}

export type CoastalSchoolFrame = ReturnType<ReturnType<typeof createCoastalSchool>['frame']>
