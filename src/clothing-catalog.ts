import { anglerCost, appearanceParts, uniforms } from './crew-appearance.ts'
import { stockedPieces, type PieceSlot, type StockId } from './wardrobe-stock.ts'

function slotItems<Slot extends PieceSlot>(slot: Slot) {
  const group: Readonly<Record<string, { name: string; price: number }>> = stockedPieces[slot]
  return Object.fromEntries(Object.entries(group).map(([id, piece]) =>
    [id, { name: piece.name, price: piece.price, slot, choice: id }])) as Record<StockId<Slot>, {
    name: string; price: number; slot: Slot; choice: StockId<Slot>
  }>
}

export const clothingCatalog = {
  angler: { name: uniforms.angler.name, price: anglerCost, slot: 'uniform', choice: 'angler' },
  'coral-shirt': { name: appearanceParts.shirt.choices.coral, price: 1, slot: 'shirt', choice: 'coral' },
  'lagoon-swimsuit': { name: appearanceParts.shirt.choices.lagoon, price: 2, slot: 'shirt', choice: 'lagoon' },
  ...slotItems('hat'),
  ...slotItems('shirt'),
  ...slotItems('trousers'),
  ...slotItems('shoes'),
} as const

export type ClothingId = keyof typeof clothingCatalog
export const clothingIds = Object.keys(clothingCatalog) as ClothingId[]

export function isClothingId(value: unknown): value is ClothingId {
  return typeof value === 'string' && Object.hasOwn(clothingCatalog, value)
}

interface ClothingOwner {
  ownsAngler: boolean
  ownedClothes?: ClothingId[]
}

export function ownsClothing(owner: ClothingOwner, id: ClothingId) {
  return (id === 'angler' && owner.ownsAngler) || Boolean(owner.ownedClothes?.includes(id))
}

export function shopItemFor(slot: 'uniform' | PieceSlot, choice?: string): ClothingId | undefined {
  if (isClothingId(choice) && clothingCatalog[choice].slot === slot) return choice
  if (slot !== 'shirt') return
  if (choice === 'coral') return 'coral-shirt'
  if (choice === 'lagoon') return 'lagoon-swimsuit'
}
