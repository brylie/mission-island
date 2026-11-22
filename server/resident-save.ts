import { gateFavor } from '../src/gate-repair.ts'
import { blankRecord, initialResidents, rebuildFavors } from '../src/residents/trust.ts'
import { starterResident, starterResidents } from '../src/worlds/starter/residents.ts'
import { saveVersions } from './save-version.ts'

// How resident records are saved, migrated and checked. A resident missing from a save is added as a stranger.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

// Version 4 keeps one record per resident in place of Wren's trust, and names the favor on the last receipt.
export function migrateResidents(value: unknown): unknown {
  if (!isRecord(value) || value.version !== saveVersions.gateRepair || !isRecord(value.world)) return value
  const { residentTrust, lastFavorPay, ...world } = value.world
  const stage = isRecord(world.gateRepair) ? world.gateRepair.stage : undefined
  const residents = initialResidents(starterResidents)
  residents.wren = {
    ...blankRecord(),
    trust: isRecord(residentTrust) ? residentTrust.wren as number : 0,
    kept: stage === 'mended' ? [gateFavor] : [],
    active: stage === 'accepted' || stage === 'inspected' || stage === 'fitted' ? gateFavor : null,
  }
  const receipt = isRecord(lastFavorPay) ? { ...lastFavorPay, favor: gateFavor } : undefined
  return { ...value, version: saveVersions.residentFavor, world: { ...world, residents, ...receipt && { lastFavorPay: receipt } } }
}

// Version 6 gives each record what the crew last found on checked work, any broken promise, and rebuilt breaches.
export function migrateTrust(value: unknown): unknown {
  if (!isRecord(value) || value.version !== saveVersions.ferryRepair || !isRecord(value.world) || !isRecord(value.world.residents)) return value
  const residents = Object.fromEntries(Object.entries(value.world.residents)
    .map(([id, record]) => [id, isRecord(record) ? { ...blankRecord(), ...record } : record]))
  return { ...value, version: saveVersions.residentStanding, world: { ...value.world, residents } }
}

// A breach names a favor of this resident. Until amends it is the favor still under way; after, it is kept.
function isBreach(value: unknown, record: Record<string, unknown>, owns: (favor: unknown) => boolean | undefined, islandTime: number) {
  if (value === null) return true
  if (!isRecord(value) || !owns(value.favor) || typeof value.amended !== 'boolean' || !isCount(value.rebuilt)
    || typeof value.at !== 'number' || value.at < 0 || value.at > islandTime) return false
  const kept = Array.isArray(record.kept) && record.kept.includes(value.favor)
  return value.amended ? kept && value.rebuilt < rebuildFavors : !kept && record.active === value.favor && value.rebuilt === 0
}

// Known residents only, each with whole trust, distinct kept favors of their own, at most one other under way,
// a finding only while a favor is under way, and a consistent breach.
export function isResidentRecords(value: unknown, islandTime: number) {
  if (!isRecord(value)) return false
  return Object.entries(value).every(([id, record]) => {
    const resident = starterResident(id)
    const owns = (favor: unknown) => resident?.favors.some((entry) => entry.id === favor)
    return resident && isRecord(record) && isCount(record.trust) && isCount(record.forgiven) && Array.isArray(record.kept)
      && new Set(record.kept).size === record.kept.length && record.kept.every(owns)
      && (record.active === null || (owns(record.active) && !record.kept.includes(record.active)))
      && (record.checked === null || ((record.checked === 'fault' || record.checked === 'sound') && record.active !== null))
      && isBreach(record.breach, record, owns, islandTime)
  })
}

export function isFavorReceipt(value: unknown) {
  return isRecord(value) && isCount(value.coins) && typeof value.resident === 'string'
    && Boolean(starterResident(value.resident)?.favors.some((favor) => favor.id === value.favor))
}
