import { journalEntry } from '../src/journal/catalog.ts'
import { emptyJournal, placeName, type Journal, type JournalNote } from '../src/journal/journal.ts'
import { isOutingId, outingSubjects, type OutingId } from '../src/journal/outing.ts'
import { spawns } from '../src/world.ts'

const outingAliases = new Map<string, OutingId>([
  ['driftwood-edge', 'biome:driftwood-edge'],
  ['foxglove', 'sight:foxglove'],
  ['limpet', 'sight:limpet'],
  ['clover', 'sight:clover'],
  ['hare-grazing', 'sight:hare/grazing'],
  ['hare-sheltering', 'sight:hare/sheltering'],
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function within(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max
}

function isNote(value: unknown, islandTime: number): value is JournalNote {
  return isRecord(value) && within(value.t, islandTime)
    && (value.by === undefined || (within(value.by, spawns.length - 1) && Number.isInteger(value.by)))
    && (value.at === undefined || (typeof value.at === 'string' && Boolean(placeName(value.at))))
    && (value.rain === undefined || within(value.rain, 1))
}

function isSavedJournal(value: Record<string, unknown>, islandTime: number): value is Record<string, unknown> & Journal {
  if (value.version !== 1 || typeof value.heardMara !== 'boolean' || !isRecord(value.entries)) return false
  return Object.entries(value.entries).every(([id, entry]) => {
    if (!journalEntry(id) || !isRecord(entry)) return false
    const { first, outing } = entry
    if (first === undefined && outing === undefined) return id.startsWith('place:')
    return (first === undefined || isNote(first, islandTime))
      && (outing === undefined || (isOutingId(id) && isNote(outing, islandTime)))
  })
}

function fromOuting(value: Record<string, unknown>, islandTime: number) {
  if (typeof value.heardMara !== 'boolean' || !Array.isArray(value.records)) return undefined
  const journal = emptyJournal()
  journal.heardMara = value.heardMara
  for (const entry of value.records) {
    if (!isRecord(entry) || typeof entry.id !== 'string') return undefined
    const id = outingAliases.get(entry.id) ?? entry.id
    if (!journalEntry(id) || journal.entries[id] || (!isOutingId(id) && !id.startsWith('place:'))) return undefined
    const { seen } = entry
    if (seen === undefined && id.startsWith('place:')) {
      journal.entries[id] = {}
      continue
    }
    if (!isRecord(seen) || !within(seen.time, islandTime) || !within(seen.rain, 1)) return undefined
    const note = { t: seen.time, rain: seen.rain }
    journal.entries[id] = isOutingId(id) ? { outing: { ...note, at: outingSubjects[id].at } } : { first: note }
  }
  return journal
}

// Both old branches used the same world key. Only this adapter reads their unversioned shapes.
export function readJournal(value: unknown, islandTime: number): Journal | undefined {
  if (!isRecord(value)) return undefined
  if ('version' in value) return isSavedJournal(value, islandTime) ? value : undefined
  if ('records' in value || 'heardMara' in value) return fromOuting(value, islandTime)
  const journal = emptyJournal()
  for (const [id, note] of Object.entries(value)) {
    if (!journalEntry(id) || !isNote(note, islandTime) || note.by === undefined || !Number.isInteger(note.t)) return undefined
    journal.entries[id] = { first: note }
  }
  return journal
}
