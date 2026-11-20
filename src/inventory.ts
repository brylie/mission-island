export const starterTools = ['fishing-rod', 'hoe', 'watering-can'] as const
export type InventoryItem = typeof starterTools[number]

export const toolNames: Record<InventoryItem, string> = {
  'fishing-rod': 'Fishing rod',
  hoe: 'Hoe',
  'watering-can': 'Watering can',
}
