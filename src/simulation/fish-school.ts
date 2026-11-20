// All distances are metres. The visual trial advances in fixed steps for reproducible encounters.
import { seededRandom } from '../seeded-random.ts'
import type { Point } from '../world.ts'

export const schoolStep = 1 / 30
export const poolRadius = 8

interface Fish extends Point {
  vx: number
  vz: number
  alarm: number
  bias: number
}

export function createSchool(seed: number) {
  const random = seededRandom(seed)
  // Scatter the six starting positions within the central shoal.
  const fish: Fish[] = Array.from({ length: 6 }, (_, i) => ({
    x: (i % 3 - 1) * .95 + (random() - .5) * .5, z: (Math.floor(i / 3) - .5) * 1.2 + (random() - .5) * .5,
    vx: .25, vz: .1, alarm: 0, bias: (random() - .5) * 1.8,
  }))
  return { fish, random, leader: -1, scattered: false, encounters: 0, time: 0 }
}
type School = ReturnType<typeof createSchool>

function neighborForce(fish: Fish, school: School) {
  const spacing = school.leader >= 0 ? 1.05 : .85
  let x = 0, z = 0, count = 0, alignX = 0, alignZ = 0
  for (const other of school.fish) {
    if (other === fish) continue
    const dx = other.x - fish.x, dz = other.z - fish.z, distance = Math.hypot(dx, dz)
    if (distance < spacing) {
      const repel = 4 * (spacing - distance) / Math.max(.01, distance)
      x -= dx * repel
      z -= dz * repel
    }
    if (distance < 2.5) {
      alignX += dx * .22 + (other.vx - fish.vx) * .35
      alignZ += dz * .22 + (other.vz - fish.vz) * .35
      count++
    }
  }
  return { x: x + alignX / Math.max(1, count), z: z + alignZ / Math.max(1, count) }
}

function swim(fish: Fish, school: School, threat: Point, range: number): Fish {
  const dx = fish.x - threat.x, dz = fish.z - threat.z
  const alarm = Math.hypot(dx, dz) < range ? .85 : Math.max(0, fish.alarm - schoolStep)
  const leader = school.fish[school.leader]
  const cruiseAngle = school.time * .14 + .3
  let vx = .47 * Math.cos(cruiseAngle), vz = .47 * Math.sin(cruiseAngle)
  if (alarm > 0) {
    const escape = Math.atan2(dz, dx) + fish.bias
    vx = 2.6 * Math.cos(escape)
    vz = 2.6 * Math.sin(escape)
  } else if (leader && leader !== fish) {
    const toX = leader.x - fish.x, toZ = leader.z - fish.z
    const approach = Math.min(.8, 1.5 / Math.max(1, Math.hypot(toX, toZ)))
    vx = leader.vx + toX * approach
    vz = leader.vz + toZ * approach
  }
  const neighbors = neighborForce(fish, school)
  const radius = Math.hypot(fish.x, fish.z)
  const bank = Math.max(0, radius - (poolRadius - 2)) / Math.max(1, radius)
  const ax = (vx - fish.vx) * 2 + neighbors.x - fish.x * bank * 4
  const az = (vz - fish.vz) * 2 + neighbors.z - fish.z * bank * 4
  const delta = schoolStep * Math.min(1, 5 / Math.max(.01, Math.hypot(ax, az)))
  const nextVx = fish.vx + ax * delta, nextVz = fish.vz + az * delta
  const x = fish.x + nextVx * schoolStep, z = fish.z + nextVz * schoolStep
  const shore = Math.min(1, (poolRadius - .4) / Math.max(.01, Math.hypot(x, z)))
  return { ...fish, alarm, x: x * shore, z: z * shore, vx: nextVx, vz: nextVz }
}

export function advanceSchool(school: School, threat: Point, range: number) {
  school.time += schoolStep
  school.fish = school.fish.map(fish => swim(fish, school, threat, range))
  if (school.fish.some(fish => fish.alarm > 0)) {
    if (!school.scattered) school.encounters++
    school.scattered = true
    school.leader = -1
  } else if (school.scattered) {
    school.leader = Math.floor(school.random() * school.fish.length)
    school.scattered = false
  }
}
