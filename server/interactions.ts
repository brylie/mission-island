import { interactions, rechecksInHandler, requiresExplicitChoice, sameChoice } from '../src/interaction-options.ts'
import type { InteractionAction, InteractionChoice } from '../src/interaction-options.ts'
import { heldItem } from '../src/interactions/cargo.ts'
import type { Snapshot } from '../src/protocol.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { canOccupyGround } from '../src/simulation/movement.ts'
import { groundHeight, maxWadeDepth, waterDepth } from '../src/terrain.ts'
import { crateSize, itemStarts, spawns } from '../src/world.ts'
import { stopPrimary, stopped, type CrewMember } from './crew.ts'
import { restingY, updateHeldItems } from './items.ts'

export type InteractionHandlers<Action extends InteractionAction = InteractionAction>
  = Record<Action, (member: CrewMember, subject: number) => void>

export function createInteractions(
  state: Snapshot,
  handlers: InteractionHandlers,
  physics: Pick<ReturnType<typeof createCargoPhysics>, 'release' | 'relocate'>,
  checkpoint?: () => void,
) {
  // E runs the interaction the player chose, only while it is still open to them; with no choice, the best one in reach.
  function interact(member: CrewMember, choice?: InteractionChoice) {
    const { player } = member
    if (player.seat) return
    if (player.sleeping) {
      player.sleeping = false
      return
    }
    // Field inspections recheck their own targets so a stale choice can tell the player what happened.
    if (choice && rechecksInHandler(choice.action)) {
      handlers[choice.action](member, choice.subject ?? -1)
      return
    }
    const options = interactions(state, player)
    const chosen = choice
      ? options.find((option) => sameChoice(option, choice))
      : options.find(({ action }) => !requiresExplicitChoice(action))
    if (!chosen) return
    handlers[chosen.action](member, chosen.subject ?? -1)
    updateHeldItems(state)
  }

  function respawn(member: CrewMember) {
    const { player } = member
    const item = heldItem(state, player)
    if (item) {
      item.holder = null
      const safe = canOccupyGround(player, crateSize / 2, -maxWadeDepth) && waterDepth(player) <= maxWadeDepth
      // A crate carried into danger returns to its start quietly; one set down where the crewmate stands is a real drop.
      if (item.kind === 'crate' && safe) physics.release(item, player)
      else if (item.kind === 'crate') physics.relocate(item, itemStarts[item.id].start)
      else {
        const point = safe ? player : itemStarts[item.id].start
        Object.assign(item, { x: point.x, z: point.z, y: safe ? groundHeight(point) + 0.04 : restingY(item.id), spraying: false })
      }
    }
    const home = spawns[player.id]
    Object.assign(player, { ...home, y: groundHeight(home), heading: 0, seat: null, grounded: true, onBed: false, truckSurface: undefined, swimming: false, sleeping: false, casting: null, reaching: false, rightHandRaised: false, throwing: false, rowing: false })
    stopPrimary(member)
    member.input = stopped
    member.verticalSpeed = 0
    member.reachUntil = 0
    member.throwUntil = 0
    checkpoint?.()
  }

  return { interact, respawn }
}
