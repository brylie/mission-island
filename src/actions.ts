import type { Item, Player, Snapshot } from './protocol'
import { market, nearbyPlot, seedPrice } from './farm.ts'
import { distance, truckSeatSpeed } from './world.ts'
import { heldItem } from './interactions/cargo.ts'
import { besideSubject, defaultInteraction } from './interaction-options.ts'
import type { Interaction, InteractionChoice } from './interaction-options.ts'

export { heldItem }
export { atClothingCounter, atHomeDoor } from './interactions/home.ts'

export function canSpray(state: Snapshot, player: Player, item?: Item) {
  return state.mission === 'fire' && !player.seat
    && item?.kind === 'extinguisher'
}

export function inSkiff(seat: Player['seat']) {
  return seat === 'port' || seat === 'starboard'
}

export function canBoardSkiff(state: Snapshot, player: Player) {
  return !player.seat && player.grounded && !player.onBed && !heldItem(state, player)
    && Math.abs(state.skiff.speed) < 0.65 && distance(state.skiff, player) < 3.3
    && state.players.filter((crew) => inSkiff(crew.seat)).length < 2
}

export function canCast(state: Snapshot, player: Player) {
  if (player.equipped !== 'fishing-rod') return false
  if (inSkiff(player.seat)) return Math.abs(state.skiff.speed) < 0.35
  return !player.seat && player.grounded && !player.onBed && !player.swimming
}

// Hints for keys other than E, shown when nothing is in reach for E.
function fallbackHint(state: Snapshot, player: Player): [string, string] {
  if (player.grounded && !player.onBed && distance(player, market) < 2.25) {
    return state.crewCoins >= seedPrice ? ['B', `Buy a carrot seed for ${seedPrice} coin`] : ['', 'Sell fish or carrots to buy seeds']
  }
  const plot = player.grounded && !player.onBed ? state.farm[nearbyPlot(player)] : undefined
  if (plot === 'grass') return player.equipped === 'hoe' ? ['Left click', 'Till soil'] : ['2', 'Equip hoe']
  if (plot === 'tilled') return ['', player.starterSeedClaimed ? 'Buy carrot seeds at Seabrook Market' : 'Pick up a starter seed at home']
  if (plot === 'planted') return player.equipped === 'watering-can' ? ['Left click', 'Water carrots'] : ['3', 'Equip watering can']
  if (plot === 'watered') return ['', state.weather.hour > 6 && state.weather.hour < 18
    ? 'Carrots are growing'
    : 'Watered · growth resumes at sunrise']
  if (player.grounded && !player.onBed && !player.truckSurface && distance(player, state.truck) < 4.5
    && Math.abs(state.truck.speed) <= truckSeatSpeed) return ['F', 'Board truck']
  if (canBoardSkiff(state, player)) return ['F', 'Board skiff']
  if (canCast(state, player)) return ['Left click', 'Hold and release to cast']
  return ['', '']
}

function ridingHint(state: Snapshot, player: Player): [string, string] {
  if (inSkiff(player.seat)) {
    if (canCast(state, player)) return ['Left click', 'Hold and release to cast']
    return player.inventory.includes('fishing-rod') && !player.equipped
      ? ['1', 'Equip fishing rod']
      : ['WASD', 'Paddle and steer']
  }
  if (Math.abs(state.truck.speed) <= truckSeatSpeed) return ['F', 'Exit truck']
  return player.seat === 'driver' ? ['Space', 'Brake to exit truck'] : ['', 'Wait for the truck to stop']
}

// What E acts on: the interaction under the reticle, else the best one in reach. With nothing else to
// prompt for, a journal subject within arm's reach counts, so recording does not depend on mouse aim.
function chosenInteraction(state: Snapshot, player: Player, focus?: Interaction) {
  return focus ?? defaultInteraction(state, player) ?? (fallbackHint(state, player)[1] ? undefined : besideSubject(state, player))
}

// The prompt names the interaction under the reticle, or the best one in reach.
export function actionHint(state: Snapshot, player: Player, focus?: Interaction): [string, string] {
  if (player.sleeping) return ['E', 'Waiting for your crewmate · Cancel']
  if (player.swimming) return canBoardSkiff(state, player) ? ['F', 'Climb into skiff'] : ['WASD', 'Swim to shore']
  const fight = player.casting?.fight
  if (fight) return ['Left click', fight.pulling ? 'Fish pulling · release to ease tension' : 'Fish hooked · hold to reel']
  if (player.casting) return ['', 'Watching the bobber']
  if (player.seat) return ridingHint(state, player)
  const option = chosenInteraction(state, player, focus)
  return option ? [option.key, option.label] : fallbackHint(state, player)
}

// What E sends: the interaction the player chose, so the host can refuse one that is no longer open.
export function interactRequest(state: Snapshot, player: Player, focus?: Interaction):
  { type: 'interact', choice?: InteractionChoice } | 'open-job-board' {
  const option = chosenInteraction(state, player, focus)
  if (!option) return { type: 'interact' }
  if (option.action === 'job-board') return 'open-job-board'
  return { type: 'interact', choice: { action: option.action, ...(option.subject !== undefined && { subject: option.subject }) } }
}
