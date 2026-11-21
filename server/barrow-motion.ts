import { barrowClearance, barrowContains, pushedBarrowPose } from '../src/barrow.ts'
import { gateBlockers, solidTop } from '../src/gate-repair.ts'
import type { Player, Snapshot } from '../src/protocol.ts'
import { canOccupyGround, isInsideTruck } from '../src/simulation/movement.ts'
import { walkingHeight, waterDepth } from '../src/terrain.ts'
import { offset, type Pose } from '../src/world.ts'
import { looseCargoTop } from './items.ts'

export function canPushBarrow(state: Snapshot, player: Player, destination: Pose) {
  const cart = pushedBarrowPose(destination)
  const ground = walkingHeight(destination)
  const gate = gateBlockers(state)
  return barrowClearance.every(({ x, z, radius }) => {
    const point = offset(cart, x, z)
    return canOccupyGround(point, radius, 0) && waterDepth(point) < 0.15
      && Math.abs(walkingHeight(point) - ground) < 0.43
      && !isInsideTruck(state.truck, point, radius)
      && solidTop(gate, point, radius) === -Infinity && looseCargoTop(state.items, point, radius) === -Infinity
  }) && !state.players.some((other) => other.id !== player.id && other.connected && !other.seat
    && Math.abs(other.y - ground) < 0.9 && barrowContains(cart, other, 0.29))
}
