import { clothingCounter, market } from '../farm.ts'
import type { Player, Snapshot } from '../protocol.ts'
import { isNight } from '../weather.ts'
import { cottageDoor, crewHomes, distance } from '../world.ts'
import { aimedAt, type InteractionOption, type InteractionPolicies } from './definition.ts'

const chestReach = 2
const doorReach = 1.45
const wardrobeReach = 1.45
const clothingCounterReach = 2.15
const wardrobeTargetRadius = 0.6
const clothingCounterTargetRadius = 0.7
const doorTargetHeight = 1.2
const doorTargetRadius = 0.7
const chestTargetHeight = 0.4
const chestTargetRadius = 0.55

export const homeActions = {
  'open-wardrobe': 'default',
  'open-clothing-counter': 'default',
  'sleep': 'default',
  'chest': 'default',
  'welcome-note': 'default',
} as const satisfies InteractionPolicies
export type HomeAction = keyof typeof homeActions

function atHomeChest(player: Player) {
  const home = crewHomes[player.id]
  return !player.seat && player.grounded && !player.onBed && home && distance(home.chest, player) < chestReach
}

export function atHomeDoor(player: Player) {
  const home = crewHomes[player.id]
  if (!home || player.seat || !player.grounded || player.onBed) return false
  const gap = distance(player, cottageDoor(home))
  return gap < doorReach && gap < distance(player, home.chest)
}

function canBrowseClothing(player: Player) {
  return player.grounded && !player.seat && !player.onBed && !player.swimming && !player.sleeping && !player.truckSurface
}

function atHomeWardrobe(player: Player) {
  const home = crewHomes[player.id]
  if (!home || !canBrowseClothing(player)) return false
  const gap = distance(player, home.wardrobe)
  return gap < wardrobeReach && gap < distance(player, cottageDoor(home))
}

export function atClothingCounter(player: Player) {
  return canBrowseClothing(player) && distance(player, clothingCounter) < clothingCounterReach
}

function clothingInteraction(player: Player) {
  if (atHomeWardrobe(player)) return 'open-wardrobe'
  if (atClothingCounter(player) && distance(player, clothingCounter) < distance(player, market)) return 'open-clothing-counter'
}

export function homeInteractions(state: Snapshot, player: Player): InteractionOption<HomeAction>[] {
  const home = crewHomes[player.id]
  const options: InteractionOption<HomeAction>[] = []
  const clothing = clothingInteraction(player)
  if (clothing === 'open-wardrobe') {
    options.push({ action: clothing, key: 'E', label: 'Open your wardrobe', name: 'Wardrobe', at: aimedAt(home.wardrobe, 1), radius: wardrobeTargetRadius })
  }
  else if (clothing) {
    options.push({ action: clothing, key: 'E', label: 'Browse the clothing counter', name: 'Clothing counter', at: aimedAt(clothingCounter, 1), radius: clothingCounterTargetRadius })
  }
  const ownDoor = atHomeDoor(player)
  if (ownDoor && isNight(state.weather.hour)) {
    options.push({ action: 'sleep', key: 'E', label: 'Turn in for the night', name: 'Your door', at: aimedAt(cottageDoor(home), doorTargetHeight), radius: doorTargetRadius })
  }
  if (!ownDoor && atHomeChest(player)) {
    const label = !player.starterSeedClaimed
      ? (player.inventory.length ? 'Collect starter carrot seed' : 'Take tools and a carrot seed')
      : player.inventory.length ? 'Store tools' : 'Take starter tools'
    options.push({ action: 'chest', key: 'E', label, name: 'Your tool chest', at: aimedAt(home.chest, chestTargetHeight), radius: chestTargetRadius })
  }
  return options
}

export function welcomeNote(state: Snapshot, player: Player): InteractionOption<HomeAction>[] {
  if (!atHomeDoor(player) || isNight(state.weather.hour)) return []
  return [{
    action: 'welcome-note',
    key: 'E',
    label: 'Read your welcome note',
    name: 'Your door',
    at: aimedAt(cottageDoor(crewHomes[player.id]), doorTargetHeight),
    radius: doorTargetRadius,
  }]
}
