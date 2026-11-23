import type { Player, Snapshot } from '../src/protocol.ts'
import { canUseBinoculars, markCooldownMs, withinMarkReach } from '../src/spotting.ts'
import { walkingHeight, waterLevel } from '../src/terrain.ts'
import type { Point } from '../src/world.ts'
import type { CrewCommand } from './commands.ts'
import type { CrewBroadcast, CrewMember } from './crew.ts'

// The browser waits the full cooldown before sending; the host allows this much less, so ordinary network jitter rarely drops a mark.
const networkLeewayMs = 250

type MarkCommand = Extract<CrewCommand, { type: 'mark' | 'clear-mark' }>

export function createCrewMarks(
  state: Pick<Snapshot, 'marks' | 'aviation' | 'farmWork'>,
  clock: () => number,
  notifyAll: CrewBroadcast,
  sightMark: (point: Point, player: Player) => boolean,
) {
  const lastMarkAt = new Map<number, number>()

  function remove(playerId: number) {
    const before = state.marks.length
    state.marks = state.marks.filter((mark) => mark.playerId !== playerId)
    return state.marks.length < before
  }

  function place(member: CrewMember, point: Point) {
    const { player } = member
    if (!canUseBinoculars(state, player)) return member.notify?.({ type: 'crew-mark', event: 'refused', reason: 'busy' })
    if (!withinMarkReach(player, point)) return member.notify?.({ type: 'crew-mark', event: 'refused', reason: 'reach' })
    const now = clock()
    const last = lastMarkAt.get(player.id)
    if (last !== undefined && now - last < markCooldownMs - networkLeewayMs) return
    lastMarkAt.set(player.id, now)
    // The host sets the height from its own ground, so the beacon stands on the island wherever the click came from.
    const mark = { playerId: player.id, x: point.x, y: Math.max(walkingHeight(point), waterLevel), z: point.z }
    remove(player.id)
    state.marks.push(mark)
    // The fire's own notice goes first, so the crew's last word names who marked it.
    const fire = sightMark(mark, player)
    notifyAll({ type: 'crew-mark', event: 'placed', playerId: player.id, x: mark.x, z: mark.z, ...(fire && { fire }) })
  }

  function clear(member: CrewMember) {
    if (remove(member.player.id)) notifyAll({ type: 'crew-mark', event: 'cleared', playerId: member.player.id })
  }

  return {
    command(member: CrewMember, message: MarkCommand) {
      if (message.type === 'mark') place(member, message)
      else clear(member)
    },
    // A crewmate who leaves takes their mark with them, so a later crewmate in the same slot never inherits it.
    drop(playerId: number) {
      remove(playerId)
      lastMarkAt.delete(playerId)
    },
  }
}
