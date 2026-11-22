import type { Item, Player, Snapshot } from './protocol'
import { isVehicleGear } from './rescue-gear.ts'
import { market, marketTradeReach, nearbyPlot, seedPrice } from './farm.ts'
import { distance, truckSeatSpeed } from './world.ts'
import { heldItem } from './interactions/cargo.ts'
import { interactionChoice } from './interactions/definition.ts'
import { besideSubject, defaultInteraction } from './interaction-options.ts'
import type { Interaction, InteractionChoice } from './interaction-options.ts'
import { flatbedHasSeat, learnerVehicles, nearestBoardableLearner, practiceStatus, practiceStop } from './learner-vehicles.ts'

const skiffBoardSpeed = 0.65
const skiffBoardReach = 3.3
const skiffSeatCount = 2
const skiffExitSpeed = 0.35
const daylightGrowthStartsHour = 6
const daylightGrowthEndsHour = 18
const truckBoardReach = 4.5

export function canSpray(state: Snapshot, player: Player, item?: Item) {
  // Pickup extinguishers spray anywhere; the Fire Supplies pair only during the lookout fire.
  return !player.seat && item?.kind === 'extinguisher' && (state.mission === 'fire' || isVehicleGear(item))
}

export function inSkiff(seat: Player['seat']) {
  return seat === 'port' || seat === 'starboard'
}

export function canBoardSkiff(state: Snapshot, player: Player) {
  return !player.seat && player.grounded && !player.onBed && !heldItem(state, player)
    && Math.abs(state.skiff.speed) < skiffBoardSpeed && distance(state.skiff, player) < skiffBoardReach
    && state.players.filter((crew) => inSkiff(crew.seat)).length < skiffSeatCount
}

export function canCast(state: Snapshot, player: Player) {
  if (player.equipped !== 'fishing-rod') return false
  if (inSkiff(player.seat)) return Math.abs(state.skiff.speed) < skiffExitSpeed
  return !player.seat && player.grounded && !player.onBed && !player.swimming
}

// Board whichever road vehicle is closest, as the host does.
function roadBoardingHint(state: Snapshot, player: Player): [string, string] | undefined {
  if (!player.grounded || player.onBed || player.truckSurface) return
  const learner = nearestBoardableLearner(state.vehicles, state.players, player)
  const truckNear = distance(player, state.truck) < truckBoardReach && Math.abs(state.truck.speed) <= truckSeatSpeed && flatbedHasSeat(state.players)
  if (learner && (!truckNear || distance(state.vehicles[learner], player) < distance(state.truck, player))) {
    return ['F', `${learner === 'tractor' ? 'Drive' : 'Board'} ${learnerVehicles[learner].noun}`]
  }
  if (truckNear) return ['F', 'Board truck']
}

// Hints for keys other than E, shown when nothing is in reach for E.
function fallbackHint(state: Snapshot, player: Player): [string, string] {
  if (player.grounded && !player.onBed && distance(player, market) < marketTradeReach) {
    return state.crewCoins >= seedPrice ? ['B', `Buy a carrot seed for ${seedPrice} coin`] : ['', 'Sell fish or carrots to buy seeds']
  }
  const plot = player.grounded && !player.onBed ? state.farm[nearbyPlot(player)] : undefined
  if (plot === 'grass') return player.equipped === 'hoe' ? ['Left click', 'Till soil'] : ['2', 'Equip hoe']
  if (plot === 'tilled') return ['', player.starterSeedClaimed ? 'Buy carrot seeds at Seabrook Market' : 'Pick up a starter seed at home']
  if (plot === 'planted') return player.equipped === 'watering-can' ? ['Left click', 'Water carrots'] : ['3', 'Equip watering can']
  if (plot === 'watered') return ['', state.weather.hour > daylightGrowthStartsHour && state.weather.hour < daylightGrowthEndsHour
    ? 'Carrots are growing'
    : 'Watered · growth resumes at sunrise']
  const boarding = roadBoardingHint(state, player)
  if (boarding) return boarding
  if (canBoardSkiff(state, player)) return ['F', 'Board skiff']
  if (canCast(state, player)) return ['Left click', 'Hold and release to cast']
  return ['', '']
}

function learnerHint(state: Snapshot, player: Player): [string, string] {
  const id = player.vehicle!
  const { noun } = learnerVehicles[id]
  const stopped = Math.abs(state.vehicles[id].speed) <= truckSeatSpeed
  const stop = practiceStop(id, state.practice[id])
  if (player.seat !== 'driver') return stopped ? ['F', `Exit ${noun} · heading for ${stop.name}`] : ['', `Riding to ${stop.name}`]
  const status = practiceStatus(state.vehicles[id], stop)
  if (status === 'rolling') return ['Space', `Brake to a full stop in the ring at ${stop.name}`]
  if (status === 'close' && stopped) return ['WASD', `Pull forward into the ring at ${stop.name}`]
  return stopped ? ['F', `Exit ${noun} · or drive to ${stop.name}`] : ['WASD', `Drive to ${stop.name} · Space to stop in the ring`]
}

function ridingHint(state: Snapshot, player: Player): [string, string] {
  if (player.vehicle) return learnerHint(state, player)
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
  if (!option) return fallbackHint(state, player)
  return [option.key, option.action === 'record' ? `${option.label} · ${option.name}` : option.label]
}

// What E sends: the interaction the player chose, so the host can refuse one that is no longer open.
export function interactRequest(state: Snapshot, player: Player, focus?: Interaction):
  { type: 'interact', choice?: InteractionChoice } | 'open-job-board' {
  const option = chosenInteraction(state, player, focus)
  if (!option) return { type: 'interact' }
  if (option.action === 'job-board') return 'open-job-board'
  return { type: 'interact', choice: interactionChoice(option) }
}
