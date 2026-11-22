import { canCast, canSpray, inSkiff } from '../src/actions.ts'
import { heldItem } from '../src/interactions/cargo.ts'
import { biteSeconds, castTravelSeconds, chargePower } from '../src/charged-actions.ts'
import { ownsClothing, shopItemFor } from '../src/clothing-catalog.ts'
import { outfitRequirement, type CrewAppearance } from '../src/crew-appearance.ts'
import { pieceSlots } from '../src/wardrobe-stock.ts'
import type { InventoryItem } from '../src/inventory.ts'
import { nearbyPlot } from '../src/farm.ts'
import type { FishId } from '../src/journal/fish.ts'
import type { FishingResult, Player, Snapshot } from '../src/protocol.ts'
import { offset, type Point } from '../src/world.ts'
import { crateHalfSize, type createCargoPhysics } from '../src/simulation/cargo.ts'
import type { CrewCommand } from './commands.ts'
import { stopPrimary, stowTool, type CrewMember } from './crew.ts'
import { castPoint, catchChance, initialFishingTension, stepFight } from '../src/simulation/fishing.ts'
import { recordCultivation } from './cultivation-cues.ts'
import { canOccupyGround, isInsideTruck } from '../src/simulation/movement.ts'
import type { GameplayPlaytestMetrics } from './gameplay-playtest-metrics.ts'
import { crewInputTimeoutMs, millisecondsPerSecond } from './host-time.ts'
import { heldCrateForwardM } from './items.ts'
import type { createRescueGearUse } from './rescue-gear.ts'

const toolReachDurationMs = 220
const crateLaunchHeightM = 1.76
const throwGestureDurationMs = 270

function cultivateWithTool(state: Snapshot, player: Player) {
  if (!player.grounded || player.onBed) return false
  const plot = nearbyPlot(player)
  if (player.equipped === 'hoe' && state.farm[plot] === 'grass') {
    state.farm[plot] = 'tilled'
    recordCultivation(state, 'hoe', plot, player.id)
    return true
  }
  if (player.equipped === 'watering-can' && state.farm[plot] === 'planted') {
    state.farm[plot] = 'watered'
    recordCultivation(state, 'water', plot, player.id)
    return true
  }
  return false
}

export function createEquipment(
  state: Snapshot,
  physics: Pick<ReturnType<typeof createCargoPhysics>, 'launch'>,
  tickSeconds: number,
  random: () => number,
  landed: (player: Player, bobber: Point) => FishId,
  checkpoint?: () => void,
  metrics?: Pick<GameplayPlaytestMetrics, 'use' | 'result'>,
  gear?: ReturnType<typeof createRescueGearUse>,
) {
  function fishResult(member: CrewMember, result: FishingResult, fish?: FishId) {
    member.notify?.({ type: 'fishing-result', result, ...(fish && { fish }) })
    metrics?.result(state, member.player, { mechanic: 'fishing', result })
  }

  function isReadyToCast(member: CrewMember) {
    const { player, input } = member
    return canCast(state, player) && !input.x && !input.z
      && (!inSkiff(player.seat) || !state.players.some((other) => other.rowing))
  }

  function startPrimary(member: CrewMember, now: number) {
    const { player } = member
    if (member.primary || player.sleeping) return
    const item = heldItem(state, player)
    if (item && gear?.start(member, item, now)) return
    if (item?.kind === 'crate' && !player.seat) {
      member.primary = { kind: 'throw', since: now, itemId: item.id }
      player.charge = { kind: 'throw', power: 0 }
    }
    else if (item && canSpray(player, item)) {
      member.primary = { kind: 'spray', since: now, itemId: item.id }
    }
    else if (!item && player.equipped === 'fishing-rod') {
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
    }
    else if (!item && !player.seat) {
      if (cultivateWithTool(state, player)) metrics?.use(state, player, 'farming')
      member.primary = { kind: 'reach', since: now }
      member.reachUntil = now + toolReachDurationMs
    }
  }

  function releasePrimary(member: CrewMember, aim: number | undefined, now: number) {
    const { player, primary } = member
    stopPrimary(member)
    if (!primary || (primary.kind !== 'throw' && primary.kind !== 'cast')) return
    const heading = aim ?? member.input.aim ?? player.heading
    const power = chargePower(primary.kind, (now - primary.since) / millisecondsPerSecond)
    if (primary.kind === 'cast' && isReadyToCast(member)) {
      const bobber = castPoint({ ...player, heading }, power)
      if (bobber) {
        if (!player.seat) player.heading = heading
        player.casting = { bobber, elapsed: 0, power }
        metrics?.use(state, player, 'fishing')
        metrics?.result(state, player, { mechanic: 'fishing', result: 'cast' })
      }
      else fishResult(member, 'dry-cast')
    }
    if (primary.kind !== 'throw' || player.seat) return
    const item = heldItem(state, player)
    if (item && item.id === primary.itemId && gear?.release(member, item, heading, power, now)) return
    if (!item || item.id !== primary.itemId || item.kind !== 'crate') return
    player.heading = heading
    item.heading = heading
    const front = offset(player, 0, heldCrateForwardM)
    const origin = canOccupyGround(front, crateHalfSize, -1)
      && (!isInsideTruck(state.truck, front) || player.onBed)
      ? front
      : player
    item.holder = null
    physics.launch(item, origin, player.y + crateLaunchHeightM, power)
    member.throwUntil = now + throwGestureDurationMs
    player.throwing = true
  }

  function updateFishing(member: CrewMember, allowed: boolean) {
    const { player } = member
    if (!allowed) {
      if (metrics && player.casting && inSkiff(player.seat) && (!canCast(state, player) || state.players.some((other) => other.rowing))) {
        metrics.result(state, player, { mechanic: 'fishing', result: 'line-retrieved-by-motion' })
      }
      if (member.primary?.kind === 'cast' || member.primary?.kind === 'reel') stopPrimary(member)
      player.casting = null
    }
    else if (player.casting) {
      const cast = player.casting
      cast.elapsed += tickSeconds
      if (cast.fight) {
        const result = stepFight(cast.fight, cast.elapsed - castTravelSeconds - biteSeconds, member.primary?.kind === 'reel', tickSeconds)
        if (result) {
          if (result === 'caught') player.goods.fish++
          fishResult(member, result, result === 'caught' ? landed(player, cast.bobber) : undefined)
          player.casting = null
          stopPrimary(member)
          if (result === 'caught') checkpoint?.()
        }
      }
      else if (cast.elapsed >= castTravelSeconds + biteSeconds) {
        if (random() < catchChance(cast.power)) {
          cast.fight = { progress: 0, tension: initialFishingTension, pulling: false }
        }
        else {
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
    }
    else if (message.phase === 'release') {
      if (now - member.lastInput <= crewInputTimeoutMs) releasePrimary(member, message.aim, now)
      else stopPrimary(member)
    }
    else if (message.phase === 'cancel') {
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

export function setAppearance(player: Player, appearance: CrewAppearance, mission: Snapshot['mission'], qualifiedFarmer: boolean) {
  const uniform = outfitRequirement(appearance.uniform, mission, ownsClothing(player, 'angler'), qualifiedFarmer)
    ? player.appearance?.uniform ?? 'default'
    : appearance.uniform
  const pieces = pieceSlots.map((slot) => {
    const item = shopItemFor(slot, appearance[slot])
    return [slot, item && !ownsClothing(player, item) ? player.appearance?.[slot] : appearance[slot]] as const
  })
  player.appearance = { ...appearance, uniform, ...Object.fromEntries(pieces) }
}
