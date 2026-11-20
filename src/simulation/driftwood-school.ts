import { inSkiff } from '../actions.ts'
import { coastPoint, waterDepth, waterLevel } from '../terrain.ts'
import type { Player, Skiff } from '../protocol.ts'
import type { Point } from '../world.ts'
import { advanceSchool, createSchool, poolRadius, type SchoolThreat, type SwimHabitat } from './fish-school.ts'

// Offshore from the middle Driftwood parasol, where the wading shelf meets open water.
export const driftwoodShallows = coastPoint(-1.08, 1.054)
const toWorld = (p: Point) => ({ x: driftwoodShallows.x + p.x, z: driftwoodShallows.z + p.z })
const depth = (p: Point) => waterDepth(toWorld(p))
const habitat: SwimHabitat = {
  // Leave room above the sand for the whole fish, including its tail on a slope.
  navigable: p => depth(p) >= .48,
  steer(p, vx, vz) {
    const ahead = { x: p.x + vx * .65, z: p.z + vz * .65 }
    const d = depth(ahead)
    // Watch the sloping shelf ahead. Prefer visible shallows and turn early at the waterline.
    const strength = Math.max(0, .95 - d) * 6 - Math.max(0, d - 1.45) * 1.9
    if (!strength) return { x: 0, z: 0 }
    const dx = depth({ x: p.x + .4, z: p.z }) - depth({ x: p.x - .4, z: p.z })
    const dz = depth({ x: p.x, z: p.z + .4 }) - depth({ x: p.x, z: p.z - .4 })
    const scale = strength / Math.max(.01, Math.hypot(dx, dz))
    return { x: dx * scale, z: dz * scale }
  },
}

export function createDriftwoodSchool(seed: number) {
  const school = createSchool(seed)
  for (const fish of school.fish) {
    // The inner edge of a randomly seeded shoal can lie on the beach.
    while (!habitat.navigable(fish)) fish.z -= .15
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
  function step(players: readonly Player[], skiff?: Skiff) {
    const threats: SchoolThreat[] = []
    function add(p: Point, range: number) {
      const x = p.x - driftwoodShallows.x, z = p.z - driftwoodShallows.z
      if (Math.hypot(x, z) < poolRadius + range) threats.push({ x, z, range })
    }
    for (const p of players) {
      if (p.connected && !p.sleeping && !p.seat && (p.swimming || (p.y <= waterLevel + .08 && waterDepth(p) > .04))) add(p, 1.9)
    }
    // Riders disturb the water once, through the hull.
    if (skiff && (Math.abs(skiff.speed) > .12 || players.some(p => p.connected && inSkiff(p.seat)))) add(skiff, 2.9)
    advanceSchool(school, threats, habitat)
    return frame()
  }
  return { step, frame }
}
export type DriftwoodFrame = ReturnType<ReturnType<typeof createDriftwoodSchool>['frame']>
