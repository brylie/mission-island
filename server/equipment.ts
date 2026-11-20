import { canCast, canSpray, heldItem, inSkiff } from '../src/actions.ts'
import { biteSeconds, castTravelSeconds, chargePower } from '../src/charged-actions.ts'
import type { CrewAppearance } from '../src/crew-appearance.ts'
import type { InventoryItem } from '../src/inventory.ts'
import { nearbyPlot } from '../src/farm.ts'
import type { FishingResult, Snapshot } from '../src/protocol.ts'
import { crateSize, offset } from '../src/world.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import type { CrewCommand } from './commands.ts'
import { stopPrimary, stowTool, type CrewMember } from './crew.ts'
import { castPoint, catchChance, stepFight } from '../src/simulation/fishing.ts'
import { recordCultivation } from './cultivation-cues.ts'
import { canOccupyGround, isInsideTruck } from '../src/simulation/movement.ts'

export function createEquipment(
  state: Snapshot, physics: Pick<ReturnType<typeof createCargoPhysics>, 'launch'>,
  tickSeconds: number, random: () => number, checkpoint?: () => void,
) {
  function fishResult(member: CrewMember, result: FishingResult) {
    member.notify?.({ type: 'fishing-result', result })
  }

  function isReadyToCast(member: CrewMember) {
    const { player, input } = member
    return canCast(state, player) && !input.x && !input.z &&
      (!inSkiff(player.seat) || !state.players.some((other) => other.rowing))
  }

  function startPrimary(member: CrewMember, now: number) {
    const { player } = member
    if (member.primary || player.sleeping) return
    const item = heldItem(state, player)
    if (item?.kind === 'crate' && !player.seat) {
      member.primary = { kind: 'throw', since: now, itemId: item.id }
      player.charge = { kind: 'throw', power: 0 }
    } else if (item && canSpray(state, player, item)) {
      member.primary = { kind: 'spray', since: now, itemId: item.id }
    } else if (!item && player.equipped === 'fishing-rod') {
      if (!isReadyToCast(member)) {
        if (inSkiff(player.seat)) fishResult(member, 'boat-moving')
        return
      }
      if (player.casting?.fight) {
        member.primary = { kind: 'reel', since: now }
        return
      }
      if (player.casting) return
      member.primary = { kind: 'cast', since: now }
      player.charge = { kind: 'cast', power: 0 }
    } else if (!item && !player.seat) {
      if (player.grounded && !player.onBed) {
        const plot = nearbyPlot(player)
        if (player.equipped === 'hoe' && state.farm[plot] === 'grass') {
          state.farm[plot] = 'tilled'
          recordCultivation(state, 'hoe', plot, player.id)
        }
        if (player.equipped === 'watering-can' && state.farm[plot] === 'planted') {
          state.farm[plot] = 'watered'
          recordCultivation(state, 'water', plot, player.id)
        }
      }
      member.primary = { kind: 'reach', since: now }
      member.reachUntil = now + 220
    }
  }

  function releasePrimary(member: CrewMember, aim: number | undefined, now: number) {
    const { player, primary } = member
    stopPrimary(member)
    if (!primary || (primary.kind !== 'throw' && primary.kind !== 'cast')) return
    const heading = aim ?? member.input.aim ?? player.heading
    const power = chargePower(primary.kind, (now - primary.since) / 1000)
    if (primary.kind === 'cast' && isReadyToCast(member)) {
      const bobber = castPoint({ ...player, heading }, power)
      if (bobber) {
        if (!player.seat) player.heading = heading
        player.casting = { bobber, elapsed: 0, power }
      } else fishResult(member, 'dry-cast')
    }
    if (primary.kind !== 'throw' || player.seat) return
    const item = heldItem(state, player)
    if (!item || item.id !== primary.itemId || item.kind !== 'crate') return
    player.heading = heading
    item.heading = heading
    const front = offset(player, 0, 0.89)
    const origin = canOccupyGround(front, crateSize / 2, -1) &&
      (!isInsideTruck(state.truck, front) || player.onBed) ? front : player
    item.holder = null
    physics.launch(item, origin, player.y + 1.76, power)
    member.throwUntil = now + 270
    player.throwing = true
  }

  function updateFishing(member: CrewMember, allowed: boolean) {
    const { player } = member
    if (!allowed) {
      if (member.primary?.kind === 'cast' || member.primary?.kind === 'reel') stopPrimary(member)
      player.casting = null
    } else if (player.casting) {
      const cast = player.casting
      cast.elapsed += tickSeconds
      if (cast.fight) {
        const result = stepFight(cast.fight, cast.elapsed - castTravelSeconds - biteSeconds,
          member.primary?.kind === 'reel', tickSeconds)
        if (result) {
          if (result === 'caught') player.goods.fish++
          fishResult(member, result)
          player.casting = null
          stopPrimary(member)
          if (result === 'caught') checkpoint?.()
        }
      } else if (cast.elapsed >= castTravelSeconds + biteSeconds) {
        if (random() < catchChance(cast.power)) {
          cast.fight = { progress: 0, tension: 0.25, pulling: false }
        } else {
          fishResult(member, 'no-bite')
          player.casting = null
        }
      }
    }
  }

  function handlePrimary(member: CrewMember, message: Extract<CrewCommand, { type: 'primary' }>, now: number) {
    if (message.phase === 'start') {
      member.lastInput = now
      startPrimary(member, now)
    } else if (message.phase === 'release') {
      if (now - member.lastInput <= 400) releasePrimary(member, message.aim, now)
      else stopPrimary(member)
    } else if (message.phase === 'cancel') {
      stopPrimary(member)
    }
  }

  function equip(member: CrewMember, item: InventoryItem) {
    const { player } = member
    if (!player.inventory.includes(item) || heldItem(state, player) || (player.seat && !inSkiff(player.seat))) return
    stopPrimary(member)
    if (player.equipped === item) stowTool(member)
    else {
      player.casting = null
      player.equipped = item
    }
  }

  return { handlePrimary, isReadyToCast, updateFishing, equip }
}

export function setAppearance(member: CrewMember, appearance: CrewAppearance) {
  const uniform = appearance.uniform === 'angler' && !member.player.ownsAngler ? 'default' : appearance.uniform
  member.player.appearance = { ...appearance, uniform }
}
