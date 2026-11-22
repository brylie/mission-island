import type { Input, Player } from '../protocol.ts'
import { overlapsProp, propTop } from '../scenery.ts'
import { groundHeight, maxWadeDepth, walkingHeight, waterLevel, withinSkiffBoundary } from '../terrain.ts'
import { truckPoint, truckSurface } from '../truck-pose.ts'
import type { TruckPose } from '../truck-pose.ts'
import { buildings, chestSize, crewCarrySpeed, crewHomes, crewSprintMultiplier, crewWalkSpeed, jumpGravity, localPoint, offset, onDock, truckBed, truckHood, truckRoof, truckSideRails, truckTailLip } from '../world.ts'
import type { Point, Pose } from '../world.ts'

const halfExtentDivisor = 2
const propProbeRadiusM = 0.18
const crewWallRadiusM = 0.4
const propTopLeewayM = 0.055
const recoveryRingSpacingM = 0.5
const recoveryRadiusM = 8
const recoveryDirections = 16
const recoveryDirectionsPerHalfTurn = recoveryDirections / halfExtentDivisor
const truckEnvelopeHalfWidthM = 1.39
const truckEnvelopeHalfLengthM = 3.15
const platformFeetLeewayM = 0.025
const platformEdgeLeewayM = 0.04
const bedThresholdLeewayM = 0.015
const cabThresholdZM = 0.08
const sideRailClearanceM = 0.14
const sideRailEndClearanceM = 0.06
const tailgateSideClearanceM = 0.12
const tailgateEndClearanceM = 0.10
const maxWadeSlowdown = 0.48
const swimSpeedMps = 3.8
const swimmerFeetDepthM = 0.52
const baseStepUpM = 0.27
const strideStepUpRatio = 1.2
const swimEntryClearanceM = 0.25
const maximumStepDownM = 0.32

function clearFixedWalls(point: Point, radius: number) {
  return buildings.every((building) =>
    Math.abs(point.x - building.x) > building.w / halfExtentDivisor + radius
    || Math.abs(point.z - building.z) > building.d / halfExtentDivisor + radius) && crewHomes.every(({ chest }) => Math.abs(point.x - chest.x) > chestSize.width / halfExtentDivisor + radius
      || Math.abs(point.z - chest.z) > chestSize.depth / halfExtentDivisor + radius)
}

export function canOccupyGround(point: Point, radius: number, minimumY: number) {
  return groundHeight(point) >= minimumY && clearFixedWalls(point, radius) && !overlapsProp(point, radius)
}

export function canWalkAt(point: Point, radius: number, minimumY: number) {
  return canOccupyGround(point, radius, onDock(point) ? -Infinity : minimumY)
}

// A saved jump can land inside a moved building. Props also need recovery at ground level.
export function recoverSceneryOverlap(player: Player, extra: ExtraSurface = () => -Infinity) {
  if (player.seat || player.swimming || player.onBed || player.truckSurface) return
  const top = Math.max(propTop(player, propProbeRadiusM), extra(player, propProbeRadiusM))
  if (clearFixedWalls(player, crewWallRadiusM) && (!player.grounded || top <= player.y + propTopLeewayM)) return
  for (let radius = recoveryRingSpacingM; radius <= recoveryRadiusM; radius += recoveryRingSpacingM) {
    for (let direction = 0; direction < recoveryDirections; direction++) {
      const point = offset({ ...player, heading: Math.PI + direction * Math.PI / recoveryDirectionsPerHalfTurn }, 0, radius)
      if (!canWalkAt(point, crewWallRadiusM, waterLevel - maxWadeDepth) || extra(point, crewWallRadiusM) > -Infinity) continue
      Object.assign(player, point, { y: walkingHeight(point), grounded: true })
      return
    }
  }
}

export function isInsideTruck(truck: Pose, point: Point, padding = 0) {
  const local = localPoint(truck, point)
  return Math.abs(local.x) < truckEnvelopeHalfWidthM + padding && Math.abs(local.z) < truckEnvelopeHalfLengthM + padding
}

const platforms = { roof: truckRoof, hood: truckHood, bed: truckBed } as const
type Platform = keyof typeof platforms
type Motor = { player: Pick<Player, 'x' | 'z' | 'y' | 'heading' | 'grounded' | 'onBed' | 'swimming' | 'truckSurface'>, verticalSpeed: number }
type ExtraSurface = (point: Point, padding: number) => number
interface WalkLimit { pace: number, allows(point: Pose): boolean }

function truckPlatform(truck: TruckPose, point: Point, clearance: number) {
  for (const surface of Object.keys(platforms) as Platform[]) {
    const { top, width, center, length } = platforms[surface]
    const local = truckSurface(truck, point, top)
    if (clearance >= local.y - platformFeetLeewayM && Math.abs(local.x) <= width / halfExtentDivisor + platformEdgeLeewayM
      && Math.abs(local.z - center) <= length / halfExtentDivisor + platformEdgeLeewayM) return { surface, height: local.y }
  }
}

function truckOverlap(truck: TruckPose, point: Point, clearance: number) {
  const local = truckSurface(truck, point, 0)
  const feet = clearance - local.y
  if (feet >= truckRoof.top - platformFeetLeewayM) return 0
  if (feet >= truckHood.top - platformFeetLeewayM && local.z >= truckRoof.center + truckRoof.length / halfExtentDivisor) return 0
  const front = feet >= truckBed.top - bedThresholdLeewayM ? local.z - cabThresholdZM : Infinity
  const chassis = Math.min(truckEnvelopeHalfWidthM - Math.abs(local.x), truckEnvelopeHalfLengthM - Math.abs(local.z), front)
  if (feet >= truckBed.top + truckSideRails.height) return chassis
  const rail = Math.min(
    truckSideRails.thickness / halfExtentDivisor + sideRailClearanceM - Math.abs(Math.abs(local.x) - truckSideRails.x),
    truckBed.length / halfExtentDivisor + sideRailEndClearanceM - Math.abs(local.z - truckBed.center),
  )
  const lip = feet < truckBed.top + truckTailLip.height
    ? Math.min(truckBed.width / halfExtentDivisor + tailgateSideClearanceM - Math.abs(local.x), truckTailLip.thickness / halfExtentDivisor + tailgateEndClearanceM - Math.abs(local.z - truckTailLip.z))
    : 0
  return Math.max(chassis, rail, lip)
}

function moveHorizontally(
  player: Motor['player'],
  trucks: readonly TruckPose[],
  input: Input,
  carrying: boolean,
  dt: number,
  clearance: number,
  extra: ExtraSurface,
  limit?: WalkLimit,
) {
  if (!input.x && !input.z) return
  const { x, z, heading } = player
  player.heading = Math.atan2(input.x, input.z)
  const depth = player.truckSurface ? 0 : Math.max(0, waterLevel - Math.max(walkingHeight(player), extra(player, 0)))
  const wading = 1 - maxWadeSlowdown * Math.min(1, depth / maxWadeDepth)
  const pace = player.swimming ? swimSpeedMps : (limit?.pace ?? (carrying ? crewCarrySpeed : crewWalkSpeed)) * (input.sprint ? crewSprintMultiplier : 1) * wading
  const walk = offset(player, 0, pace * dt)
  const canWalk = (point: Point) => {
    if (!withinSkiffBoundary(point) || !clearFixedWalls(point, crewWallRadiusM)) return false
    const originHeight = player.swimming ? waterLevel - swimmerFeetDepthM : Math.max(player.y, walkingHeight(player))
    const rise = walkingHeight(point) - originHeight
    const maxRise = baseStepUpM + Math.hypot(point.x - player.x, point.z - player.z) * strideStepUpRatio
    if (player.grounded && !player.truckSurface && rise > maxRise) return false
    const top = Math.max(propTop(point, propProbeRadiusM), extra(point, propProbeRadiusM))
    if (top > clearance + propTopLeewayM && top >= Math.max(propTop(player, propProbeRadiusM), extra(player, propProbeRadiusM))) return false
    if (limit && !limit.allows({ ...point, heading: player.heading })) return false
    return trucks.every((truck) => {
      const overlap = truckOverlap(truck, point, clearance)
      return overlap <= 0 || overlap < truckOverlap(truck, player, clearance)
    })
  }
  if (walk.x !== player.x && canWalk({ x: walk.x, z: player.z })) player.x = walk.x
  if (walk.z !== player.z && canWalk({ x: player.x, z: walk.z })) player.z = walk.z
  if (limit && player.x === x && player.z === z) player.heading = heading
}

export function stepPlayer(
  motion: Motor,
  before: TruckPose,
  truck: TruckPose,
  input: Input,
  carrying: boolean,
  dt: number,
  extra: ExtraSurface = () => -Infinity,
  limit?: WalkLimit,
) {
  const { player } = motion
  const riding = player.truckSurface ?? (player.onBed ? 'bed' : undefined)
  if (riding) {
    const height = platforms[riding].top
    const local = truckSurface(before, player, height)
    Object.assign(player, truckPoint(truck, local.x, height, local.z))
    player.heading += truck.heading - before.heading
  }
  stepPlayerOnTerrain(motion, [truck], input, carrying, dt, extra, limit)
}

export function stepPlayerOnTerrain(
  motion: Motor,
  trucks: readonly TruckPose[],
  input: Input,
  carrying: boolean,
  dt: number,
  extra: ExtraSurface,
  limit?: WalkLimit,
) {
  const { player } = motion
  const nextFeet = player.y + motion.verticalSpeed * dt
  const clearance = Math.max(player.y, nextFeet)
  moveHorizontally(player, trucks, input, carrying, dt, clearance, extra, limit)

  let platform: ReturnType<typeof truckPlatform>
  for (const truck of trucks) {
    const candidate = truckPlatform(truck, player, clearance)
    if (candidate && (!platform || candidate.height > platform.height)) platform = candidate
  }
  const ground = walkingHeight(player)
  const object = Math.max(propTop(player, 0), extra(player, 0))
  const deck = platform?.height ?? -Infinity
  const floor = Math.max(ground, object <= clearance + propTopLeewayM ? object : -Infinity, deck)
  player.swimming = !platform && floor < waterLevel - maxWadeDepth && (player.grounded || clearance <= waterLevel + swimEntryClearanceM)
  if (player.swimming) {
    player.y = waterLevel - swimmerFeetDepthM
    player.grounded = true
    player.onBed = false
    player.truckSurface = undefined
    motion.verticalSpeed = 0
    return
  }
  const stepDown = player.grounded && floor >= player.y - maximumStepDownM
  const landed = motion.verticalSpeed <= 0 && (stepDown || nextFeet <= floor)
  player.truckSurface = landed && floor === deck ? platform?.surface : undefined
  player.onBed = player.truckSurface === 'bed'
  player.grounded = landed
  player.y = landed ? floor : nextFeet
  motion.verticalSpeed = landed ? 0 : motion.verticalSpeed - jumpGravity * dt
}
