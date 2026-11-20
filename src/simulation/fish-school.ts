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
  id: number
  vx: number
  vz: number
  escapeAngle: number
  alarm: number
  heading: number
  turnRate: number
  responseTicks: number
  warningTicks: number
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
      id: i, x: center.x + east * Math.cos(orientation) - north * Math.sin(orientation),
      z: center.z + east * Math.sin(orientation) + north * Math.cos(orientation),
      vx: speed * Math.cos(heading), vz: speed * Math.sin(heading),
      heading, turnRate: 0, responseTicks: 2 + Math.floor(motionRandom() * 4), warningTicks: 0,
      wander: 0, escapeAngle: heading, alarm: 0, bias: (random() - .5) * 1.8,
    }
  })
  if (nudge) fish[0].x += .05
  const leaderTrail: Fish[] = []
  return { fish, random, wander, leaderTrail, cruiseHeading, leader: -1, scattered: false, calm: 0, encounters: 0, time: 0 }
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
  let x = 0, z = 0, count = 0
  for (const threat of threats) {
    const dx = fish.x - threat.x, dz = fish.z - threat.z
    const distance = Math.hypot(dx, dz)
    if (distance >= threat.range) continue
    const weight = (1 - distance / threat.range) / Math.max(.01, distance)
    x += dx * weight
    z += dz * weight
    count++
  }
  if (!count) return undefined
  if (Math.hypot(x, z) < .04) return fish.heading + Math.sign(fish.bias || 1) * Math.PI / 2
  return Math.atan2(z, x) + fish.bias
}

function swim(fish: Fish, school: School, threats: readonly SchoolThreat[], habitat?: SwimHabitat): Fish {
  const away = disturbance(fish, threats)
  const warningTicks = away === undefined ? 0 : Math.min(fish.warningTicks + 1, fish.responseTicks)
  const reacts = away !== undefined && (fish.alarm > 0 || warningTicks === fish.responseTicks)
  const alarm = reacts ? .85 : Math.max(0, fish.alarm - schoolStep)
  const escapeAngle = reacts ? away : fish.escapeAngle
  const following = school.leader >= 0 && fish.id !== school.leader
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
  const neighborWeight = alarm > 0 ? .16 : .5
  let aimX = vx + neighbors.x * neighborWeight - fish.x * bank * 2
  let aimZ = vz + neighbors.z * neighborWeight - fish.z * bank * 2
  const shore = habitat?.steer(fish, fish.vx, fish.vz)
  if (shore) {
    const strength = Math.hypot(shore.x, shore.z)
    if (strength > 1) {
      const nx = shore.x / strength, nz = shore.z / strength
      const towardBank = Math.min(0, aimX * nx + aimZ * nz)
      aimX -= towardBank * nx
      aimZ -= towardBank * nz
      if (towardBank < 0 && Math.hypot(aimX, aimZ) < .8) {
        const side = Math.sign(fish.vx * -nz + fish.vz * nx || fish.bias || 1)
        aimX -= nz * 1.1 * side
        aimZ += nx * 1.1 * side
      }
    }
    aimX += shore.x
    aimZ += shore.z
  }
  const turn = turnToward(fish, aimX, aimZ, alarm > 0)
  const speed = Math.hypot(fish.vx, fish.vz)
  const targetSpeed = Math.max(.15, Math.min(alarm > 0 ? 2.9 : 2.1, Math.hypot(aimX, aimZ)))
  const forward = speed + (targetSpeed - speed) * 2 * schoolStep
  const nextVx = forward * Math.cos(turn.heading), nextVz = forward * Math.sin(turn.heading)
  const x = fish.x + nextVx * schoolStep, z = fish.z + nextVz * schoolStep
  const next = { x, z }
  const blocked = Math.hypot(x, z) >= poolRadius || (habitat && !habitat.navigable(next))
  const position = blocked ? fish : next
  return { ...fish, ...turn, escapeAngle, alarm, warningTicks, wander, x: position.x, z: position.z, vx: nextVx, vz: nextVz }
}

export function advanceSchool(school: School, threats: readonly SchoolThreat[], habitat?: SwimHabitat) {
  school.time += schoolStep
  const previousLeader = school.fish.find(fish => fish.id === school.leader)
  if (!previousLeader && school.leader >= 0) {
    school.leader = -1
    school.leaderTrail.length = 0
    school.scattered = true
  }
  school.fish = school.fish.map(fish => swim(fish, school, threats, habitat))
  if (previousLeader) {
    if (school.leaderTrail.length >= 5) school.leaderTrail.shift()
    school.leaderTrail.push(previousLeader)
  }
  if (school.fish.some(fish => fish.alarm > 0)) {
    if (!school.scattered) school.encounters++
    school.scattered = true
    school.leader = -1
    school.leaderTrail.length = 0
    school.calm = 0
  } else if (school.scattered && !school.fish.some(fish => fish.warningTicks > 0)) {
    school.calm += schoolStep
    if (school.calm >= .35) {
      const eligible = school.fish.filter(fish => !habitat || habitat.navigable({
        x: fish.x + fish.vx * .25, z: fish.z + fish.vz * .25,
      }))
      if (eligible.length) {
        school.leader = eligible[Math.floor(school.random() * eligible.length)].id
        school.scattered = false
      }
    }
  } else if (school.scattered) {
    school.calm = 0
  }
}
