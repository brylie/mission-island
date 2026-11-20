import type { Input, Player } from '../src/protocol.ts'
import { overlapsProp, propTop } from '../src/scenery.ts'
import { groundHeight, maxWadeDepth, walkingHeight, waterLevel, withinSkiffBoundary } from '../src/terrain.ts'
import { buildings, chestSize, crewHomes, jumpGravity, localPoint, offset, onDock, truckBed, truckHood, truckRoof, truckSideRails, truckTailLip } from '../src/world.ts'
import type { Point, Pose } from '../src/world.ts'

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

export function isInsideTruck(truck: Pose, point: Point) {
  const local = localPoint(truck, point)
  return Math.abs(local.x) < 1.39 && Math.abs(local.z) < 3.15
}

const platforms = { roof: truckRoof, hood: truckHood, bed: truckBed } as const
type Platform = keyof typeof platforms
type Motor = { player: Pick<Player, 'x' | 'z' | 'y' | 'heading' | 'grounded' | 'onBed' | 'swimming' | 'truckSurface'>; verticalSpeed: number }
type ExtraSurface = (point: Point, padding: number) => number

function truckPlatform(truck: Pose, point: Point, clearance: number) {
  const local = localPoint(truck, point)
  const base = groundHeight(truck)
  return (Object.keys(platforms) as Platform[]).find((surface) => {
    const { top, width, center, length } = platforms[surface]
    return clearance >= base + top - 0.025 && Math.abs(local.x) <= width / 2 + 0.04 &&
      Math.abs(local.z - center) <= length / 2 + 0.04
  })
}

function truckOverlap(truck: Pose, point: Point, feet: number) {
  const local = localPoint(truck, point)
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
  player: Motor['player'], truck: Pose, input: Input, carrying: boolean, dt: number, clearance: number,
  extra: ExtraSurface,
) {
  if (!input.x && !input.z) return
  player.heading = Math.atan2(input.x, input.z)
  const depth = player.truckSurface ? 0 : Math.max(0, waterLevel - walkingHeight(player))
  const wading = 1 - 0.48 * Math.min(1, depth / maxWadeDepth)
  const pace = player.swimming ? 3.8 : (carrying ? 6.5 : 8) * (input.sprint ? 1.55 : 1) * wading
  const walk = offset(player, 0, pace * dt)
  const feetAboveTruck = clearance - groundHeight(truck)
  const canWalk = (point: Point) => {
    if (!withinSkiffBoundary(point) || !clearFixedWalls(point, 0.4)) return false
    const originHeight = player.swimming ? waterLevel - 0.52 : Math.max(player.y, walkingHeight(player))
    const rise = walkingHeight(point) - originHeight
    const maxRise = 0.27 + Math.hypot(point.x - player.x, point.z - player.z) * 1.2
    if (player.grounded && !player.truckSurface && rise > maxRise) return false
    const top = Math.max(propTop(point, 0.18), extra(point, 0.18))
    if (top > clearance + 0.055 && top >= Math.max(propTop(player, 0.18), extra(player, 0.18))) return false
    const overlap = truckOverlap(truck, point, feetAboveTruck)
    return overlap <= 0 || overlap < truckOverlap(truck, player, feetAboveTruck)
  }
  if (canWalk({ x: walk.x, z: player.z })) player.x = walk.x
  if (canWalk({ x: player.x, z: walk.z })) player.z = walk.z
}

export function stepPlayer(
  motion: Motor, before: Pose, truck: Pose, input: Input, carrying: boolean, dt: number, extra: ExtraSurface = () => -Infinity,
) {
  const { player } = motion
  const riding = player.truckSurface ?? (player.onBed ? 'bed' : undefined)
  if (riding) {
    const local = localPoint(before, player)
    Object.assign(player, offset(truck, local.x, local.z))
    player.heading += truck.heading - before.heading
    player.y = groundHeight(truck) + platforms[riding].top
  }
  const nextFeet = player.y + motion.verticalSpeed * dt
  const clearance = Math.max(player.y, nextFeet)
  moveHorizontally(player, truck, input, carrying, dt, clearance, extra)

  const platform = truckPlatform(truck, player, clearance)
  const ground = walkingHeight(player)
  const object = Math.max(propTop(player, 0), extra(player, 0))
  const deck = platform ? groundHeight(truck) + platforms[platform].top : -Infinity
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
  player.truckSurface = landed && floor === deck ? platform : undefined
  player.onBed = player.truckSurface === 'bed'
  player.grounded = landed
  player.y = landed ? floor : nextFeet
  motion.verticalSpeed = landed ? 0 : motion.verticalSpeed - jumpGravity * dt
}
