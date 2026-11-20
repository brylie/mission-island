import { anglerCost, appearanceParts, uniforms } from './crew-appearance.ts'

export const clothingCatalog = {
  angler: { name: uniforms.angler.name, price: anglerCost, slot: 'uniform', choice: 'angler' },
  'coral-shirt': { name: appearanceParts.shirt.choices.coral, price: 1, slot: 'shirt', choice: 'coral' },
  'lagoon-swimsuit': { name: appearanceParts.shirt.choices.lagoon, price: 2, slot: 'shirt', choice: 'lagoon' },
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

export function shopItemFor(slot: 'uniform' | 'shirt', choice?: string) {
  return clothingIds.find(id => clothingCatalog[id].slot === slot && clothingCatalog[id].choice === choice)
}
