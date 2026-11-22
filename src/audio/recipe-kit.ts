import { seededRandom } from '../seeded-random.ts'

// Shared helpers for recipe families: strength tiers that bound the cache, and seeded variant streams.
const strengthTiers = 3
export const half = 0.5
export const tierOf = (value: number) => Math.min(strengthTiers - 1, Math.max(0, Math.floor(clamp01(value) * strengthTiers)))
export const tierValue = (tier: number) => (tier + half) / strengthTiers

export function clamp01(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

// Seeds pick related variants; the recipe name keeps the streams of each family apart.
const seedHashMultiplier = 2_654_435_761
const tierHashMultiplier = 97
const familyHashMultiplier = 16_777_619
export function variantRandom(family: string, seed: number, tier: number) {
  let hash = Math.abs(Math.floor(seed)) * seedHashMultiplier + tier * tierHashMultiplier
  for (const char of family) hash = Math.imul(hash ^ char.charCodeAt(0), familyHashMultiplier)
  return seededRandom((hash >>> 0) || 1)
}

const signedRandomRange = 2
export const jitter = (random: () => number, amount: number) => 1 + (random() * signedRandomRange - 1) * amount
