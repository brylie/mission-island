import type { HomeAction } from '../src/interactions/home.ts'
import { starterTools } from '../src/inventory.ts'
import { stopPrimary, stopped, stowTool, type CrewMember } from './crew.ts'
import type { InteractionHandlers } from './interactions.ts'

function useHomeChest(member: CrewMember) {
  const { player } = member
  stopPrimary(member)
  const firstVisit = !player.starterSeedClaimed
  if (firstVisit) {
    player.starterSeedClaimed = true
    player.seeds++
    member.notify?.({ type: 'starter-seed' })
  }
  if (!player.inventory.length) {
    player.inventory = [...starterTools]
    player.equipped = 'fishing-rod'
  }
  else if (!firstVisit) {
    player.inventory = []
    stowTool(member)
  }
}

function turnIn(member: CrewMember) {
  stopPrimary(member)
  member.player.casting = null
  member.input = stopped
  member.player.sleeping = true
}

export const homeInteractions: InteractionHandlers<HomeAction> = {
  'open-wardrobe': (member) => member.notify?.({ type: 'open-wardrobe' }),
  'open-clothing-counter': (member) => member.notify?.({ type: 'open-clothing-counter' }),
  'sleep': turnIn,
  'chest': useHomeChest,
  'welcome-note': (member) => member.notify?.({ type: 'crew-note' }),
}
