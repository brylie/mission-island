import type { Snapshot } from '../protocol.ts'
import type { FavorDefinition, ResidentDefinition, Standing, TrustTier } from './definition.ts'

// A promise the crew broke, until the resident relies on them again. Putting the work right is
// the amends; after that the resident stays wary until the crew keeps more distinct promises.
interface Breach {
  favor: string
  at: number
  amended: boolean
  rebuilt: number
}

// The crew's shared standing with one resident. Trust grows only when a favor is kept, and each
// favor counts once. Talking never earns trust, and nothing but a knowing false report costs it:
// a failed attempt, a disconnect or a declined favor carries no penalty.
export interface ResidentRecord {
  trust: number
  kept: string[]
  active: string | null
  // What the crew last found when checking the work on the active favor. Shared, so whoever reports back knows.
  checked: 'fault' | 'sound' | null
  breach: Breach | null
  // Breaches the crew has fully rebuilt from.
  forgiven: number
}

export type ResidentRecords = Record<string, ResidentRecord>

export interface FavorReceipt { resident: string; favor: string; coins: number }

// One breach costs the confidence of two kept favors, and two later favors win it back.
const breachCost = 2
export const rebuildFavors = 2

export function blankRecord(): ResidentRecord {
  return { trust: 0, kept: [], active: null, checked: null, breach: null, forgiven: 0 }
}

export function initialResidents(registry: readonly ResidentDefinition[]): ResidentRecords {
  return Object.fromEntries(registry.map(({ id }) => [id, blankRecord()]))
}

export function trustTier(trust: number): TrustTier {
  return trust >= 3 ? 'trusted' : trust >= 1 ? 'familiar' : 'stranger'
}

export function standingOf(record: Pick<ResidentRecord, 'breach'>): Standing {
  return !record.breach ? 'steady' : record.breach.amended ? 'wary' : 'wronged'
}

type Ledger = Pick<Snapshot, 'residents' | 'crewCoins' | 'lastFavorPay'>

// Credits a kept favor to the shared ledger and crew bank, and returns the trust it earned. A favor already
// kept returns null. Keeping the broken favor properly is the amends: it pays but earns no trust. Each favor
// kept afterwards rebuilds, and the last one restores the resident's reliance with a point of trust.
export function keepFavor(state: Ledger, resident: ResidentDefinition, favor: FavorDefinition) {
  const record = state.residents[resident.id]
  if (!record || record.kept.includes(favor.id)) return null
  record.kept.push(favor.id)
  if (record.active === favor.id) Object.assign(record, { active: null, checked: null })
  const { breach } = record
  let trust = favor.trust
  let restored = false
  if (breach && !breach.amended && breach.favor === favor.id) {
    breach.amended = true
    trust = 0
  } else if (breach?.amended && ++breach.rebuilt >= rebuildFavors) {
    record.breach = null
    record.forgiven++
    trust += 1
    restored = true
  }
  record.trust += trust
  state.crewCoins += favor.coins
  state.lastFavorPay = { resident: resident.id, favor: favor.id, coins: favor.coins }
  return { ...state.lastFavorPay, trust, restored }
}

// A knowing false report: the crew said the work was sound after seeing it fail. Trust falls, the favor
// stays open, and the resident remembers. A second false report before amends costs nothing more.
export function breakPromise(state: Pick<Snapshot, 'residents' | 'islandTime'>, resident: ResidentDefinition, favor: FavorDefinition) {
  const record = state.residents[resident.id]
  if (!record || record.active !== favor.id || record.breach?.amended === false) return null
  const lost = Math.min(record.trust, breachCost)
  record.trust -= lost
  record.breach = { favor: favor.id, at: state.islandTime, amended: false, rebuilt: 0 }
  record.checked = null
  return lost
}
