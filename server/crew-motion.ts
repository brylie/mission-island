import { canSpray, heldItem } from '../src/actions.ts'
import type { Item, Snapshot } from '../src/protocol.ts'
import { starterDiscoveries } from '../src/scenery.ts'
import type { TruckPose } from '../src/truck-pose.ts'
import { distance, jumpSpeed, lookout } from '../src/world.ts'
import { stopPrimary, stopped, type CrewMember } from './crew.ts'
import { looseCargoTop } from './items.ts'
import { stepPlayer } from '../src/simulation/movement.ts'

export function jump(member: CrewMember) {
  const { player } = member
  if (player.seat || !player.grounded || player.swimming) return
  player.sleeping = false
  if (member.primary?.kind === 'cast') stopPrimary(member)
  player.casting = null
  player.grounded = false
  player.onBed = false
  player.truckSurface = undefined
  member.verticalSpeed = jumpSpeed
}

export function walkCrew(
  state: Snapshot, member: CrewMember, before: TruckPose, connected: boolean, now: number,
  tickSeconds: number, completeFire: () => void, checkpoint?: () => void,
) {
  const { player, input } = member
  const { truck } = state
  const item = heldItem(state, player)
  stepPlayer(member, before, truck, connected ? input : stopped, Boolean(item), tickSeconds, (point, margin) => looseCargoTop(state.items, point, margin))
  if (!connected) return
  for (const region of starterDiscoveries) {
    if (!player.discoveries.includes(region.id) && distance(player, region.site) < 8) {
      player.discoveries.push(region.id)
      checkpoint?.()
    }
  }
  if (player.charge && input.aim !== undefined && !input.x && !input.z) player.heading = input.aim
  player.reaching = !item && (member.primary?.kind === 'reach' || now < member.reachUntil)
  player.rightHandRaised = input.raiseRightHand === true && !player.swimming && !player.sleeping &&
    item?.kind !== 'crate' && !player.throwing
  sprayExtinguisher(state, member, item, tickSeconds, completeFire)
}

function sprayExtinguisher(
  state: Snapshot, member: CrewMember, item: Item | undefined, tickSeconds: number, completeFire: () => void,
) {
  const { player, input, primary } = member
  if (!item || !canSpray(state, player, item)) return
  if (!input.spray && !(primary?.kind === 'spray' && primary.itemId === item.id)) return
  item.spraying = true
  if (distance(player, lookout) >= 5) return
  player.heading = Math.atan2(lookout.x - player.x, lookout.z - player.z)
  state.fire = Math.max(0, state.fire - tickSeconds / 5)
  if (state.fire === 0) completeFire()
}
