import type { Snapshot } from '../protocol.ts'
import type { FavorDefinition, ResidentDefinition, TrustTier } from './definition.ts'

// The crew's shared standing with one resident. Trust grows only when a favor is kept, and each
// favor counts once. Talking never earns trust. The kept list is the resident's memory of the crew.
export interface ResidentRecord {
  trust: number
  kept: string[]
  active: string | null
}

export type ResidentRecords = Record<string, ResidentRecord>

export interface FavorReceipt { resident: string; favor: string; coins: number }

export function initialResidents(registry: readonly ResidentDefinition[]): ResidentRecords {
  return Object.fromEntries(registry.map(({ id }) => [id, { trust: 0, kept: [], active: null }]))
}

export function trustTier(trust: number): TrustTier {
  return trust >= 3 ? 'trusted' : trust >= 1 ? 'familiar' : 'stranger'
}

// Credits a kept favor to the shared ledger and crew bank. A favor already kept returns null.
export function keepFavor(state: Pick<Snapshot, 'residents' | 'crewCoins' | 'lastFavorPay'>,
  resident: ResidentDefinition, favor: FavorDefinition): FavorReceipt | null {
  const record = state.residents[resident.id]
  if (!record || record.kept.includes(favor.id)) return null
  record.kept.push(favor.id)
  record.trust += favor.trust
  if (record.active === favor.id) record.active = null
  state.crewCoins += favor.coins
  state.lastFavorPay = { resident: resident.id, favor: favor.id, coins: favor.coins }
  return state.lastFavorPay
}
