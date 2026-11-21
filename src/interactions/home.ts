import { clothingCounter, market } from '../farm.ts'
import type { Player, Snapshot } from '../protocol.ts'
import { isNight } from '../weather.ts'
import { cottageDoor, crewHomes, distance } from '../world.ts'
import { aimedAt, type InteractionOption, type InteractionPolicies } from './definition.ts'

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
  return !player.seat && player.grounded && !player.onBed && home && distance(home.chest, player) < 2
}

export function atHomeDoor(player: Player) {
  const home = crewHomes[player.id]
  if (!home || player.seat || !player.grounded || player.onBed) return false
  const gap = distance(player, cottageDoor(home))
  return gap < 1.45 && gap < distance(player, home.chest)
}

function canBrowseClothing(player: Player) {
  return player.grounded && !player.seat && !player.onBed && !player.swimming && !player.sleeping && !player.truckSurface
}

function atHomeWardrobe(player: Player) {
  const home = crewHomes[player.id]
  if (!home || !canBrowseClothing(player)) return false
  const gap = distance(player, home.wardrobe)
  return gap < 1.45 && gap < distance(player, cottageDoor(home))
}

export function atClothingCounter(player: Player) {
  return canBrowseClothing(player) && distance(player, clothingCounter) < 2.15
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
    options.push({ action: clothing, key: 'E', label: 'Open your wardrobe', name: 'Wardrobe', at: aimedAt(home.wardrobe, 1), radius: 0.6 })
  }
  else if (clothing) {
    options.push({ action: clothing, key: 'E', label: 'Browse the clothing counter', name: 'Clothing counter', at: aimedAt(clothingCounter, 1), radius: 0.7 })
  }
  const ownDoor = atHomeDoor(player)
  if (ownDoor && isNight(state.weather.hour)) {
    options.push({ action: 'sleep', key: 'E', label: 'Turn in for the night', name: 'Your door', at: aimedAt(cottageDoor(home), 1.2), radius: 0.7 })
  }
  if (!ownDoor && atHomeChest(player)) {
    const label = !player.starterSeedClaimed
      ? (player.inventory.length ? 'Collect starter carrot seed' : 'Take tools and a carrot seed')
      : player.inventory.length ? 'Store tools' : 'Take starter tools'
    options.push({ action: 'chest', key: 'E', label, name: 'Your tool chest', at: aimedAt(home.chest, 0.4), radius: 0.55 })
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
    at: aimedAt(cottageDoor(crewHomes[player.id]), 1.2),
    radius: 0.7,
  }]
}
