import type { Input, Player } from '../protocol.ts'
import { overlapsProp, propTop } from '../scenery.ts'
import { groundHeight, maxWadeDepth, walkingHeight, waterLevel, withinSkiffBoundary } from '../terrain.ts'
import { truckPoint, truckSurface } from '../truck-pose.ts'
import type { TruckPose } from '../truck-pose.ts'
import { buildings, chestSize, crewCarrySpeed, crewHomes, crewSprintMultiplier, crewWalkSpeed, jumpGravity, localPoint, offset, onDock, truckBed, truckHood, truckRoof, truckSideRails, truckTailLip } from '../world.ts'
import type { Point, Pose } from '../world.ts'

function clearFixedWalls(point: Point, radius: number) {
  return buildings.every((building) =>
      Math.abs(point.x - building.x) > building.w / 2 + radius ||
      Math.abs(point.z - building.z) > building.d / 2 + radius,
    ) && crewHomes.every(({ chest }) => Math.abs(point.x - chest.x) > chestSize.width / 2 + radius ||
      Math.abs(point.z - chest.z) > chestSize.depth / 2 + radius)
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
  const top = Math.max(propTop(player, .18), extra(player, .18))
  if (clearFixedWalls(player, .4) && (!player.grounded || top <= player.y + .055)) return
  for (let radius = .5; radius <= 8; radius += .5) {
    for (let direction = 0; direction < 16; direction++) {
      const point = offset({ ...player, heading: Math.PI + direction * Math.PI / 8 }, 0, radius)
      if (!canWalkAt(point, .4, waterLevel - maxWadeDepth) || extra(point, .4) > -Infinity) continue
      Object.assign(player, point, { y: walkingHeight(point), grounded: true })
      return
    }
  }
}

export function isInsideTruck(truck: Pose, point: Point, padding = 0) {
  const local = localPoint(truck, point)
  return Math.abs(local.x) < 1.39 + padding && Math.abs(local.z) < 3.15 + padding
}

const platforms = { roof: truckRoof, hood: truckHood, bed: truckBed } as const
type Platform = keyof typeof platforms
type Motor = { player: Pick<Player, 'x' | 'z' | 'y' | 'heading' | 'grounded' | 'onBed' | 'swimming' | 'truckSurface'>; verticalSpeed: number }
type ExtraSurface = (point: Point, padding: number) => number
interface WalkLimit { pace: number; allows(point: Pose): boolean }

function truckPlatform(truck: TruckPose, point: Point, clearance: number) {
  for (const surface of Object.keys(platforms) as Platform[]) {
    const { top, width, center, length } = platforms[surface]
    const local = truckSurface(truck, point, top)
    if (clearance >= local.y - 0.025 && Math.abs(local.x) <= width / 2 + 0.04 &&
      Math.abs(local.z - center) <= length / 2 + 0.04) return { surface, height: local.y }
  }
}

function truckOverlap(truck: TruckPose, point: Point, clearance: number) {
  const local = truckSurface(truck, point, 0)
  const feet = clearance - local.y
  if (feet >= truckRoof.top - 0.025) return 0
  if (feet >= truckHood.top - 0.025 && local.z >= truckRoof.center + truckRoof.length / 2) return 0
  const front = feet >= truckBed.top - 0.015 ? local.z - 0.08 : Infinity
  const chassis = Math.min(1.39 - Math.abs(local.x), 3.15 - Math.abs(local.z), front)
  if (feet >= truckBed.top + truckSideRails.height) return chassis
  const rail = Math.min(
    truckSideRails.thickness / 2 + 0.14 - Math.abs(Math.abs(local.x) - truckSideRails.x),
    truckBed.length / 2 + 0.06 - Math.abs(local.z - truckBed.center),
  )
  const lip = feet < truckBed.top + truckTailLip.height
    ? Math.min(truckBed.width / 2 + 0.12 - Math.abs(local.x),
      truckTailLip.thickness / 2 + 0.10 - Math.abs(local.z - truckTailLip.z))
    : 0
  return Math.max(chassis, rail, lip)
}

function moveHorizontally(
  player: Motor['player'], trucks: readonly TruckPose[], input: Input, carrying: boolean, dt: number, clearance: number,
  extra: ExtraSurface, limit?: WalkLimit,
) {
  if (!input.x && !input.z) return
  const { x, z, heading } = player
  player.heading = Math.atan2(input.x, input.z)
  const depth = player.truckSurface ? 0 : Math.max(0, waterLevel - walkingHeight(player))
  const wading = 1 - 0.48 * Math.min(1, depth / maxWadeDepth)
  const pace = player.swimming ? 3.8 : (limit?.pace ?? (carrying ? crewCarrySpeed : crewWalkSpeed)) * (input.sprint ? crewSprintMultiplier : 1) * wading
  const walk = offset(player, 0, pace * dt)
  const canWalk = (point: Point) => {
    if (!withinSkiffBoundary(point) || !clearFixedWalls(point, 0.4)) return false
    const originHeight = player.swimming ? waterLevel - 0.52 : Math.max(player.y, walkingHeight(player))
    const rise = walkingHeight(point) - originHeight
    const maxRise = 0.27 + Math.hypot(point.x - player.x, point.z - player.z) * 1.2
    if (player.grounded && !player.truckSurface && rise > maxRise) return false
    const top = Math.max(propTop(point, 0.18), extra(point, 0.18))
    if (top > clearance + 0.055 && top >= Math.max(propTop(player, 0.18), extra(player, 0.18))) return false
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
  motion: Motor, before: TruckPose, truck: TruckPose, input: Input, carrying: boolean, dt: number, extra: ExtraSurface = () => -Infinity, limit?: WalkLimit,
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
  motion: Motor, trucks: readonly TruckPose[], input: Input, carrying: boolean, dt: number, extra: ExtraSurface, limit?: WalkLimit,
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
  const floor = Math.max(ground, object <= clearance + 0.055 ? object : -Infinity, deck)
  player.swimming = !platform && floor < waterLevel - maxWadeDepth && (player.grounded || clearance <= waterLevel + 0.25)
  if (player.swimming) {
    player.y = waterLevel - 0.52
    player.grounded = true
    player.onBed = false
    player.truckSurface = undefined
    motion.verticalSpeed = 0
    return
  }
  const stepDown = player.grounded && floor >= player.y - 0.32
  const landed = motion.verticalSpeed <= 0 && (stepDown || nextFeet <= floor)
  player.truckSurface = landed && floor === deck ? platform?.surface : undefined
  player.onBed = player.truckSurface === 'bed'
  player.grounded = landed
  player.y = landed ? floor : nextFeet
  motion.verticalSpeed = landed ? 0 : motion.verticalSpeed - jumpGravity * dt
}
