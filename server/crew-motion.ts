import { chargePower } from '../src/charged-actions.ts'
import { canSpray } from '../src/actions.ts'
import { heldItem } from '../src/interactions/cargo.ts'
import { lookoutSprayReach } from '../src/jobs.ts'
import type { Item, Snapshot } from '../src/protocol.ts'
import type { TruckPose } from '../src/truck-pose.ts'
import { distance, jumpSpeed, lookout, type Point } from '../src/world.ts'
import { stopPrimary, stopped, type CrewMember } from './crew.ts'
import { looseCargoTop } from './items.ts'
import { gateBlockers, solidTop } from '../src/gate-repair.ts'
import { learnerSolids } from '../src/learner-vehicles.ts'
import { ferrySolids } from '../src/ferry-repair.ts'
import { barrowWalk } from '../src/barrow-gait.ts'
import { barrowTop } from '../src/barrow.ts'
import { canPushBarrow } from './barrow-motion.ts'
import { stepPlayer } from '../src/simulation/movement.ts'
import { millisecondsPerSecond } from './host-time.ts'

const fireExtinguishSeconds = 5

export function prepareCrewMotion(member: CrewMember, active: boolean, now: number) {
  const { player } = member
  player.reaching = false
  player.rightHandRaised = false
  player.throwing = now < member.throwUntil
  if (!active) stopPrimary(member)
  if (player.charge && member.primary) {
    player.charge.power = chargePower(player.charge.kind, (now - member.primary.since) / millisecondsPerSecond)
  }
}

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
  state: Snapshot,
  member: CrewMember,
  before: TruckPose,
  connected: boolean,
  now: number,
  tickSeconds: number,
  completeFire: () => void,
  explore: (player: Snapshot['players'][number]) => void,
) {
  const { player, input } = member
  const { truck } = state
  const item = heldItem(state, player)
  const solids = [...gateBlockers(state), ...ferrySolids(state), ...learnerSolids(state.vehicles)]
  const { barrow, progress } = state.farmWork
  const pushing = barrow?.handler === player.id
  const walkingInput = pushing ? { ...input, sprint: false } : input
  const extraSurface = (point: Point, margin: number) =>
    Math.max(looseCargoTop(state.items, point, margin), solidTop(solids, point, margin), barrow && !pushing ? barrowTop(barrow, point, margin) : -Infinity)
  stepPlayer(member, before, truck, connected ? walkingInput : stopped, Boolean(item), tickSeconds, extraSurface, pushing ? { pace: progress.load ? barrowWalk.loadedSpeed : barrowWalk.emptySpeed, allows: (pose) => canPushBarrow(state, player, pose) } : undefined)
  if (!connected) return
  explore(player)
  if (player.charge && input.aim !== undefined && !input.x && !input.z) player.heading = input.aim
  player.reaching = !item && (member.primary?.kind === 'reach' || now < member.reachUntil)
  player.rightHandRaised = !pushing && input.raiseRightHand === true && !player.swimming && !player.sleeping
    && item?.kind !== 'crate' && !player.throwing
  sprayExtinguisher(state, member, item, tickSeconds, completeFire)
}

function sprayExtinguisher(
  state: Snapshot,
  member: CrewMember,
  item: Item | undefined,
  tickSeconds: number,
  completeFire: () => void,
) {
  const { player, input, primary } = member
  if (!item || !canSpray(state, player, item)) return
  if (!input.spray && !(primary?.kind === 'spray' && primary.itemId === item.id)) return
  item.spraying = true
  if (distance(player, lookout) >= lookoutSprayReach) return
  player.heading = Math.atan2(lookout.x - player.x, lookout.z - player.z)
  state.fire = Math.max(0, state.fire - tickSeconds / fireExtinguishSeconds)
  if (state.fire === 0) completeFire()
}
