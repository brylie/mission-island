import { canBoardSkiff, heldItem, inSkiff } from '../src/actions.ts'
import type { Snapshot } from '../src/protocol.ts'
import { walkingHeight } from '../src/terrain.ts'
import { truckPoint } from '../src/truck-pose.ts'
import { distance, offset, truckSeatSpeed } from '../src/world.ts'
import { stopPrimary, stowTool, type CrewMember } from './crew.ts'
import { updateHeldItems } from './items.ts'
import { canOccupyGround } from '../src/simulation/movement.ts'
import { skiffExit } from './skiff.ts'

export function toggleSeat(state: Snapshot, member: CrewMember) {
  const { player } = member
  if (player.seat) {
    const boating = inSkiff(player.seat)
    if (!boating && Math.abs(state.truck.speed) > truckSeatSpeed) return
    const side = player.seat === 'driver' ? -1 : 1
    const exit = boating
      ? skiffExit(state.skiff, player.seat)
      : [offset(state.truck, side * 2.1, 0.9), offset(state.truck, 0, -3.8)]
          .find((point) => canOccupyGround(point, 0.45, -0.10))
    if (!exit) return
    player.seat = null
    stopPrimary(member)
    player.casting = null
    player.rowing = false
    Object.assign(player, exit, { y: walkingHeight(exit), grounded: true, onBed: false })
    updateHeldItems(state)
    return
  }
  if (canBoardSkiff(state, player)) {
    stopPrimary(member)
    player.casting = null
    player.seat = state.players.some((entry) => entry.seat === 'port') ? 'starboard' : 'port'
    updateRiders(state)
    return
  }
  if (distance(state.truck, player) >= 4.5 || Math.abs(state.truck.speed) > truckSeatSpeed || !player.grounded || player.onBed || player.truckSurface
    || heldItem(state, player)?.kind === 'crate') return
  if (!state.players.some((entry) => entry.seat === 'driver')) player.seat = 'driver'
  else if (!state.players.some((entry) => entry.seat === 'passenger')) player.seat = 'passenger'
  if (player.seat) {
    stopPrimary(member)
    stowTool(member)
  }
  updateRiders(state)
  updateHeldItems(state)
}

export function updateRiders(state: Snapshot) {
  for (const player of state.players) {
    if (!player.seat) continue
    if (inSkiff(player.seat)) {
      Object.assign(player, offset(state.skiff, player.seat === 'port' ? -0.44 : 0.44, 0.25))
      player.heading = state.skiff.heading
      player.y = 0
      player.grounded = true
      player.onBed = false
      player.truckSurface = undefined
      player.swimming = false
      continue
    }
    Object.assign(player, truckPoint(state.truck, player.seat === 'driver' ? -0.65 : 0.65, 0, 1.05))
    player.heading = state.truck.heading
    player.grounded = true
    player.onBed = false
    player.truckSurface = undefined
    player.swimming = false
  }
}
