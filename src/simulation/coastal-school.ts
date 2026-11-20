import type { Point } from '../world.ts'
import { advanceSchool, createSchool, poolRadius, type SchoolThreat, type SwimHabitat } from './fish-school.ts'

export function createCoastalSchool(seed: number, origin: Point, waterDepth: (point: Point) => number) {
  const toWorld = (p: Point) => ({ x: origin.x + p.x, z: origin.z + p.z })
  const depth = (p: Point) => waterDepth(toWorld(p))
  const habitat: SwimHabitat = {
    // Leave room above the bed for the head and tail, including on a slope.
    navigable: p => depth(p) >= .48,
    steer(p, vx, vz) {
      const d = depth({ x: p.x + vx * .65, z: p.z + vz * .65 })
      const shallow = Math.max(0, .95 - d) * 6
      const deep = Math.min(.8, Math.max(0, d - 1.45) * 1.3)
      if (!shallow && !deep) return { x: 0, z: 0 }
      const dx = depth({ x: p.x + .4, z: p.z }) - depth({ x: p.x - .4, z: p.z })
      const dz = depth({ x: p.x, z: p.z + .4 }) - depth({ x: p.x, z: p.z - .4 })
      const scale = (shallow - deep) / Math.max(.01, Math.hypot(dx, dz))
      return { x: dx * scale, z: dz * scale }
    },
  }
  const school = createSchool(seed)
  for (const fish of school.fish) {
    // Seeds can straddle the waterline. Pull those fish in toward the authored wet origin.
    for (let attempt = 0; attempt < 12 && !habitat.navigable(fish); attempt++) {
      fish.x *= .75
      fish.z *= .75
    }
  }
  function step(threats: readonly SchoolThreat[]) {
    const nearby = threats.flatMap(({ x, z, range }) => {
      const dx = x - origin.x, dz = z - origin.z
      return Math.hypot(dx, dz) < poolRadius + range ? [{ x: dx, z: dz, range }] : []
    })
    advanceSchool(school, nearby, habitat)
  }
  const round = (n: number) => Math.round(n * 1000) / 1000
  function frame() {
    return {
      leader: school.leader,
      fish: school.fish.map(f => {
        const { x, z } = toWorld(f)
        return { x: round(x), z: round(z), heading: round(f.heading), startled: f.alarm > 0 }
      }),
    }
  }
  return { step, frame }
}

export type CoastalSchoolFrame = ReturnType<ReturnType<typeof createCoastalSchool>['frame']>
