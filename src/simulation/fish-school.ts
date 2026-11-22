// All distances are metres. The visual trial advances in fixed steps for reproducible encounters.
import { seededRandom } from '../seeded-random.ts'
import { createWander } from './motion-noise.ts'
import type { Point } from '../world.ts'

const updatesPerSecond = 30
export const schoolStep = 1 / updatesPerSecond
export const poolRadius = 8
export const schoolSize = 6
export const threatBuffer = 1.25

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

const half = 0.5
const wanderSeedSalt = 0xa37126ed
const wanderResponsePerSecond = 0.65
const wanderNoise = 0.29
const initialCenterWidthM = 2.2
const initialCenterDepthM = 1.6
const initialShoalWidthVariationM = 0.9
const initialShoalDepthM = 0.75
const initialShoalDepthVariationM = 0.65
const initialSectorVariation = 0.55
const initialRadialMinimum = 0.65
const initialRadialVariation = 0.55
const initialHeadingVariationRad = 1.4
const initialSpeedMps = 0.26
const initialSpeedVariationMps = 0.39
const minimumResponseTicks = 2
const maximumResponseTicks = 5
const responseChoices = maximumResponseTicks - minimumResponseTicks + 1
const escapeBiasVariationRad = 1.8
const trialNudgeM = 0.05
const sectorsPerHalfTurn = schoolSize * half
const fullTurn = Math.PI + Math.PI

export function createSchool(seed: number, nudge = false) {
  const random = seededRandom(seed)
  const motionRandom = seededRandom(seed ^ wanderSeedSalt)
  const wander = createWander(motionRandom, schoolStep, wanderResponsePerSecond, wanderNoise)
  const center = { x: (random() - half) * initialCenterWidthM, z: (random() - half) * initialCenterDepthM }
  const cruiseHeading = random() * fullTurn
  const width = 1 + random() * initialShoalWidthVariationM
  const depth = initialShoalDepthM + random() * initialShoalDepthVariationM
  const orientation = random() * fullTurn
  const fish: Fish[] = Array.from({ length: schoolSize }, (_, i) => {
    // Sample sectors of an irregular shoal to leave space between starting fish.
    const angle = (i + (random() - half) * initialSectorVariation) * Math.PI / sectorsPerHalfTurn
    const east = width * (initialRadialMinimum + random() * initialRadialVariation) * Math.cos(angle)
    const north = depth * (initialRadialMinimum + random() * initialRadialVariation) * Math.sin(angle)
    const heading = cruiseHeading + (random() - half) * initialHeadingVariationRad
    const speed = initialSpeedMps + random() * initialSpeedVariationMps
    return {
      id: i,
      x: center.x + east * Math.cos(orientation) - north * Math.sin(orientation),
      z: center.z + east * Math.sin(orientation) + north * Math.cos(orientation),
      vx: speed * Math.cos(heading),
      vz: speed * Math.sin(heading),
      heading,
      turnRate: 0,
      responseTicks: minimumResponseTicks + Math.floor(motionRandom() * responseChoices),
      warningTicks: 0,
      wander: 0,
      escapeAngle: heading,
      alarm: 0,
      bias: (random() - half) * escapeBiasVariationRad,
    }
  })
  if (nudge) fish[0].x += trialNudgeM
  const leaderTrail: Fish[] = []
  return { fish, random, wander, leaderTrail, cruiseHeading, leader: -1, scattered: false, calm: 0, encounters: 0, time: 0 }
}
type School = ReturnType<typeof createSchool>

const spacingBehindLeaderM = 1.05
const cruiseSpacingM = 0.85
const overlapEpsilonM = 0.01
const neighborRepulsionGain = 4
const alignmentRadiusM = 2.5
const neighborPositionGain = 0.22
const neighborVelocityGain = 0.35

function neighborForce(fish: Fish, school: School) {
  const spacing = school.leader >= 0 ? spacingBehindLeaderM : cruiseSpacingM
  let x = 0, z = 0, count = 0, alignX = 0, alignZ = 0
  for (const other of school.fish) {
    if (other === fish) continue
    const dx = other.x - fish.x, dz = other.z - fish.z, distance = Math.hypot(dx, dz)
    if (distance < spacing) {
      const repel = neighborRepulsionGain * (spacing - distance) / Math.max(overlapEpsilonM, distance)
      x -= dx * repel
      z -= dz * repel
    }
    if (distance < alignmentRadiusM) {
      alignX += dx * neighborPositionGain + (other.vx - fish.vx) * neighborVelocityGain
      alignZ += dz * neighborPositionGain + (other.vz - fish.vz) * neighborVelocityGain
      count++
    }
  }
  return { x: x + alignX / Math.max(1, count), z: z + alignZ / Math.max(1, count) }
}

const alarmTurnLimitRadPerSecond = 3.4
const cruiseTurnLimitRadPerSecond = 1.9
const holdHeadingBelowMps = 0.16
const rearArcRad = 2.7
const committedTurnRadPerSecond = 0.2
const turnResponsePerSecond = 3.5
const alarmTurnAcceleration = 14
const cruiseTurnAcceleration = 8

// Keep a body heading even when forward speed is near zero. In a tight U-turn,
// keep banking to the same side until the target is clearly out of the rear arc.
function turnToward(fish: Fish, x: number, z: number, startled: boolean) {
  const limit = startled ? alarmTurnLimitRadPerSecond : cruiseTurnLimitRadPerSecond
  const direction = Math.hypot(x, z) < holdHeadingBelowMps ? fish.heading : Math.atan2(z, x)
  let error = Math.atan2(Math.sin(direction - fish.heading), Math.cos(direction - fish.heading))
  if (Math.abs(error) > rearArcRad && Math.abs(fish.turnRate) > committedTurnRadPerSecond) error = Math.sign(fish.turnRate) * Math.abs(error)
  const target = Math.max(-limit, Math.min(limit, error * turnResponsePerSecond))
  const change = (startled ? alarmTurnAcceleration : cruiseTurnAcceleration) * schoolStep
  const turnRate = fish.turnRate + Math.max(-change, Math.min(change, target - fish.turnRate))
  return { heading: fish.heading + turnRate * schoolStep, turnRate }
}

const balancedThreatPush = 0.04
const quarterTurn = Math.PI * half

function disturbance(fish: Fish, threats: readonly SchoolThreat[]) {
  let x = 0, z = 0, count = 0
  for (const threat of threats) {
    const dx = fish.x - threat.x, dz = fish.z - threat.z
    const distance = Math.hypot(dx, dz)
    if (distance >= threat.range) continue
    const weight = (1 - distance / threat.range) / Math.max(overlapEpsilonM, distance)
    x += dx * weight
    z += dz * weight
    count++
  }
  if (!count) return undefined
  if (Math.hypot(x, z) < balancedThreatPush) return fish.heading + Math.sign(fish.bias || 1) * quarterTurn
  return Math.atan2(z, x) + fish.bias
}

const threatPushMps = 1.25
const passThreatSidewaysMps = 0.65

function steerClear(fish: Fish, aim: Point, threats: readonly SchoolThreat[]) {
  for (const threat of threats) {
    const dx = fish.x - threat.x, dz = fish.z - threat.z
    const distance = Math.hypot(dx, dz)
    const buffer = threat.range + threatBuffer
    if (distance < overlapEpsilonM || distance >= buffer) continue
    const nx = dx / distance, nz = dz / distance
    const urgency = Math.min(1, (buffer - distance) / threatBuffer)
    const inward = Math.min(0, aim.x * nx + aim.z * nz)
    // Bend a following or cruising path around a nearby threat after the burst ends.
    const correction = urgency * (threatPushMps - inward)
    aim.x += nx * correction
    aim.z += nz * correction
    if (inward < 0) {
      const side = Math.sign(aim.z * nx - aim.x * nz || fish.vz * nx - fish.vx * nz || fish.bias || 1)
      aim.x -= nz * urgency * passThreatSidewaysMps * side
      aim.z += nx * urgency * passThreatSidewaysMps * side
    }
  }
}

const squarePower = 2

function crossesThreatRange(fish: Fish, next: Point, threats: readonly SchoolThreat[]) {
  return threats.some((threat) => {
    const radiusSquared = threat.range * threat.range
    return (next.x - threat.x) ** squarePower + (next.z - threat.z) ** squarePower < radiusSquared
      && (fish.x - threat.x) ** squarePower + (fish.z - threat.z) ** squarePower >= radiusSquared
  })
}

const alarmDurationS = 0.85
const cruiseTurnRadPerSecond = 0.14
const cruiseSpeedMps = 0.47
const escapeSpeedMps = 2.6
const maximumLeaderPull = 0.8
const leaderFollowMps = 1.5
const bankBufferM = 2
const alarmNeighborWeight = 0.16
const cruiseNeighborWeight = 0.5
const bankResponse = 2
const minimumShoreRepulsion = 1
const minimumClearingSpeedMps = 0.8
const bankSidestepMps = 1.1
const minimumSwimSpeedMps = 0.15
const maximumBurstSpeedMps = 2.9
const maximumSchoolSpeedMps = 2.1
const speedResponsePerSecond = 2

function swim(fish: Fish, school: School, threats: readonly SchoolThreat[], habitat?: SwimHabitat): Fish {
  const away = disturbance(fish, threats)
  const warningTicks = away === undefined ? 0 : Math.min(fish.warningTicks + 1, fish.responseTicks)
  const reacts = away !== undefined && (fish.alarm > 0 || warningTicks === fish.responseTicks)
  const alarm = reacts ? alarmDurationS : Math.max(0, fish.alarm - schoolStep)
  const escapeAngle = reacts ? away : fish.escapeAngle
  const following = school.leader >= 0 && fish.id !== school.leader
  const leader = school.leaderTrail[school.leaderTrail.length - fish.responseTicks]
  const wander = school.wander(fish.wander)
  const cruiseAngle = school.time * cruiseTurnRadPerSecond + school.cruiseHeading
  let vx = cruiseSpeedMps * Math.cos(cruiseAngle), vz = cruiseSpeedMps * Math.sin(cruiseAngle)
  if (alarm > 0) {
    vx = escapeSpeedMps * Math.cos(escapeAngle)
    vz = escapeSpeedMps * Math.sin(escapeAngle)
  }
  else if (following && leader) {
    const toX = leader.x - fish.x, toZ = leader.z - fish.z
    const approach = Math.min(maximumLeaderPull, leaderFollowMps / Math.max(1, Math.hypot(toX, toZ)))
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
  const bank = Math.max(0, radius - (poolRadius - bankBufferM)) / Math.max(1, radius)
  const neighborWeight = alarm > 0 ? alarmNeighborWeight : cruiseNeighborWeight
  let aimX = vx + neighbors.x * neighborWeight - fish.x * bank * bankResponse
  let aimZ = vz + neighbors.z * neighborWeight - fish.z * bank * bankResponse
  const shore = habitat?.steer(fish, fish.vx, fish.vz)
  if (shore) {
    const strength = Math.hypot(shore.x, shore.z)
    if (strength > minimumShoreRepulsion) {
      const nx = shore.x / strength, nz = shore.z / strength
      const towardBank = Math.min(0, aimX * nx + aimZ * nz)
      aimX -= towardBank * nx
      aimZ -= towardBank * nz
      if (towardBank < 0 && Math.hypot(aimX, aimZ) < minimumClearingSpeedMps) {
        const side = Math.sign(fish.vx * -nz + fish.vz * nx || fish.bias || 1)
        aimX -= nz * bankSidestepMps * side
        aimZ += nx * bankSidestepMps * side
      }
    }
    aimX += shore.x
    aimZ += shore.z
  }
  const aim = { x: aimX, z: aimZ }
  steerClear(fish, aim, threats)
  const turn = turnToward(fish, aim.x, aim.z, alarm > 0)
  const speed = Math.hypot(fish.vx, fish.vz)
  const targetSpeed = Math.max(minimumSwimSpeedMps, Math.min(alarm > 0 ? maximumBurstSpeedMps : maximumSchoolSpeedMps, Math.hypot(aim.x, aim.z)))
  const forward = speed + (targetSpeed - speed) * speedResponsePerSecond * schoolStep
  const nextVx = forward * Math.cos(turn.heading), nextVz = forward * Math.sin(turn.heading)
  const x = fish.x + nextVx * schoolStep, z = fish.z + nextVz * schoolStep
  const next = { x, z }
  // A moving threat can reach the fish first. Let the fish finish its turn without entering from outside.
  const blocked = Math.hypot(x, z) >= poolRadius || (habitat && !habitat.navigable(next)) || crossesThreatRange(fish, next, threats)
  const position = blocked ? fish : next
  return { ...fish, ...turn, escapeAngle, alarm, warningTicks, wander, x: position.x, z: position.z, vx: nextVx, vz: nextVz }
}

const calmBeforeRegroupingS = 0.35
const leaderClearanceLookAheadS = 0.25

export function advanceSchool(school: School, threats: readonly SchoolThreat[], habitat?: SwimHabitat) {
  school.time += schoolStep
  const previousLeader = school.fish.find((fish) => fish.id === school.leader)
  if (!previousLeader && school.leader >= 0) {
    school.leader = -1
    school.leaderTrail.length = 0
    school.scattered = true
  }
  school.fish = school.fish.map((fish) => swim(fish, school, threats, habitat))
  if (previousLeader) {
    if (school.leaderTrail.length >= maximumResponseTicks) school.leaderTrail.shift()
    school.leaderTrail.push(previousLeader)
  }
  if (school.fish.some((fish) => fish.alarm > 0)) {
    if (!school.scattered) school.encounters++
    school.scattered = true
    school.leader = -1
    school.leaderTrail.length = 0
    school.calm = 0
  }
  else if (school.scattered && !school.fish.some((fish) => fish.warningTicks > 0)) {
    school.calm += schoolStep
    if (school.calm >= calmBeforeRegroupingS) {
      const eligible = school.fish.filter((fish) => {
        const ahead = { x: fish.x + fish.vx * leaderClearanceLookAheadS, z: fish.z + fish.vz * leaderClearanceLookAheadS }
        return (!habitat || habitat.navigable(ahead)) && !crossesThreatRange(fish, ahead, threats)
      })
      if (eligible.length) {
        school.leader = eligible[Math.floor(school.random() * eligible.length)].id
        school.scattered = false
      }
    }
  }
  else if (school.scattered) {
    school.calm = 0
  }
}
