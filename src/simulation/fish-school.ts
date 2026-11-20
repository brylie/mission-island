// All distances are metres. The visual trial advances in fixed steps for reproducible encounters.
import { seededRandom } from '../seeded-random.ts'
import { createWander } from './motion-noise.ts'
import type { Point } from '../world.ts'

export const schoolStep = 1 / 30
export const poolRadius = 8
export const schoolSize = 6

export interface SchoolThreat extends Point { range: number }
export interface SwimHabitat {
  steer(fish: Point, vx: number, vz: number): Point
  navigable(point: Point): boolean
}

interface Fish extends Point {
  vx: number
  vz: number
  escapeAngle: number
  alarm: number
  heading: number
  turnRate: number
  responseTicks: number
  wander: number
  bias: number
}

export function createSchool(seed: number, nudge = false) {
  const random = seededRandom(seed)
  const motionRandom = seededRandom(seed ^ 0xa37126ed)
  const wander = createWander(motionRandom, schoolStep, .65, .29)
  const center = { x: (random() - .5) * 2.2, z: (random() - .5) * 1.6 }
  const cruiseHeading = random() * 2 * Math.PI
  const width = 1 + random() * .9
  const depth = .75 + random() * .65
  const orientation = random() * Math.PI * 2
  const fish: Fish[] = Array.from({ length: schoolSize }, (_, i) => {
    // Sample sectors of an irregular shoal to leave space between starting fish.
    const angle = (i + (random() - .5) * .55) * Math.PI / 3
    const east = width * (.65 + random() * .55) * Math.cos(angle)
    const north = depth * (.65 + random() * .55) * Math.sin(angle)
    const heading = cruiseHeading + (random() - .5) * 1.4
    const speed = .26 + random() * .39
    return {
      x: center.x + east * Math.cos(orientation) - north * Math.sin(orientation),
      z: center.z + east * Math.sin(orientation) + north * Math.cos(orientation),
      vx: speed * Math.cos(heading), vz: speed * Math.sin(heading),
      heading, turnRate: 0, responseTicks: 2 + Math.floor(motionRandom() * 4), wander: 0, escapeAngle: heading, alarm: 0, bias: (random() - .5) * 1.8,
    }
  })
  if (nudge) fish[0].x += .05
  const leaderTrail: Fish[] = []
  return { fish, random, wander, leaderTrail, cruiseHeading, leader: -1, scattered: false, encounters: 0, time: 0 }
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

// Keep a body heading even when forward speed is near zero. In a tight U-turn,
// keep banking to the same side until the target is clearly out of the rear arc.
function turnToward(fish: Fish, x: number, z: number, startled: boolean) {
  const limit = startled ? 3.4 : 1.9
  const direction = Math.hypot(x, z) < .16 ? fish.heading : Math.atan2(z, x)
  let error = Math.atan2(Math.sin(direction - fish.heading), Math.cos(direction - fish.heading))
  if (Math.abs(error) > 2.7 && Math.abs(fish.turnRate) > .2) error = Math.sign(fish.turnRate) * Math.abs(error)
  const target = Math.max(-limit, Math.min(limit, error * 3.5))
  const change = (startled ? 14 : 8) * schoolStep
  const turnRate = fish.turnRate + Math.max(-change, Math.min(change, target - fish.turnRate))
  return { heading: fish.heading + turnRate * schoolStep, turnRate }
}

function disturbance(fish: Fish, threats: readonly SchoolThreat[]) {
  let closest: SchoolThreat | undefined, margin = 0
  for (const threat of threats) {
    const inside = threat.range - Math.hypot(fish.x - threat.x, fish.z - threat.z)
    if (inside > margin) {
      margin = inside
      closest = threat
    }
  }
  return closest
}

function swim(fish: Fish, school: School, threats: readonly SchoolThreat[], habitat?: SwimHabitat): Fish {
  const threat = disturbance(fish, threats)
  const alarm = threat ? .85 : Math.max(0, fish.alarm - schoolStep)
  const escapeAngle = threat ? Math.atan2(fish.z - threat.z, fish.x - threat.x) + fish.bias : fish.escapeAngle
  const following = school.leader >= 0 && fish !== school.fish[school.leader]
  const leader = school.leaderTrail[school.leaderTrail.length - fish.responseTicks]
  const wander = school.wander(fish.wander)
  const cruiseAngle = school.time * .14 + school.cruiseHeading
  let vx = .47 * Math.cos(cruiseAngle), vz = .47 * Math.sin(cruiseAngle)
  if (alarm > 0) {
    vx = 2.6 * Math.cos(escapeAngle)
    vz = 2.6 * Math.sin(escapeAngle)
  } else if (following && leader) {
    const toX = leader.x - fish.x, toZ = leader.z - fish.z
    const approach = Math.min(.8, 1.5 / Math.max(1, Math.hypot(toX, toZ)))
    vx = leader.vx + toX * approach
    vz = leader.vz + toZ * approach
  }
  if (!alarm) {
    const heading = Math.atan2(vz, vx) + wander
    const speed = Math.hypot(vx, vz)
    vx = Math.cos(heading) * speed
    vz = Math.sin(heading) * speed
  }
  const neighbors = neighborForce(fish, school)
  const radius = Math.hypot(fish.x, fish.z)
  const bank = Math.max(0, radius - (poolRadius - 2)) / Math.max(1, radius)
  const aimX = vx + neighbors.x * .5 - fish.x * bank * 2
  const aimZ = vz + neighbors.z * .5 - fish.z * bank * 2
  const shoreForce = habitat?.steer(fish, fish.vx, fish.vz)
  const turn = turnToward(fish, aimX + (shoreForce?.x ?? 0), aimZ + (shoreForce?.z ?? 0), alarm > 0)
  const speed = Math.hypot(fish.vx, fish.vz)
  const targetSpeed = Math.max(.15, Math.min(alarm > 0 ? 2.9 : 2.1, Math.hypot(aimX, aimZ)))
  const forward = speed + (targetSpeed - speed) * 2 * schoolStep
  const nextVx = forward * Math.cos(turn.heading), nextVz = forward * Math.sin(turn.heading)
  const x = fish.x + nextVx * schoolStep, z = fish.z + nextVz * schoolStep
  const shore = Math.min(1, (poolRadius - .4) / Math.max(.01, Math.hypot(x, z)))
  const next = { x: x * shore, z: z * shore }
  const position = habitat && !habitat.navigable(next) ? fish : next
  return { ...fish, ...turn, escapeAngle, alarm, wander, x: position.x, z: position.z, vx: nextVx, vz: nextVz }
}

export function advanceSchool(school: School, threats: readonly SchoolThreat[], habitat?: SwimHabitat) {
  school.time += schoolStep
  const previousLeader = school.fish[school.leader]
  school.fish = school.fish.map(fish => swim(fish, school, threats, habitat))
  if (school.leader >= 0) {
    if (school.leaderTrail.length >= 5) school.leaderTrail.shift()
    school.leaderTrail.push(previousLeader)
  }
  if (school.fish.some(fish => fish.alarm > 0)) {
    if (!school.scattered) school.encounters++
    school.scattered = true
    school.leader = -1
    school.leaderTrail.length = 0
  } else if (school.scattered) {
    school.leader = Math.floor(school.random() * school.fish.length)
    school.scattered = false
  }
}
