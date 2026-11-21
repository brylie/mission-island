import { starterDiscoveries } from './scenery.ts'

export const fieldSubjects = {
  'driftwood-edge': { name: 'Meadow meets the strand', place: 'Driftwood Beach',
    detail: 'The worn tread fades where turf gives way to pale sand. The line of weed and shell fragments was left by the sea.' },
  foxglove: { name: 'Common foxglove', place: 'Driftwood Beach',
    detail: 'Digitalis purpurea. Pink bells hang from tall spikes above a rosette on the sheltered grassy bank.' },
  'place:shellglass': { name: 'Shellglass Tide Pool', place: 'Shellglass Tide Pool',
    detail: 'The mended tide staff marks the rock basin. Look for the old high-water notch, wet stone and pools that hold water as the wash retreats.' },
  limpet: { name: 'Common limpet', place: 'Shellglass Tide Pool',
    detail: 'Patella vulgata. Look for small conical shells clinging to rock on the edge of the pool.' },
  'place:juniper': { name: 'Juniper Hollow', place: 'Juniper Hollow',
    detail: 'A low cairn marks the way from open grass to the pines, fallen wood and tussocks around the clearing.' },
  clover: { name: 'White clover', place: 'Juniper Hollow',
    detail: 'Trifolium repens. Low groups of three leaflets and pale flower heads mark the patch. Look for closely cropped growth where hares have grazed.' },
  'hare-grazing': { name: 'Brown hare grazing', place: 'Juniper Hollow',
    detail: 'Lepus europaeus. Watch from the edge of the clearing for a long-eared hare lowering its head into the clover.' },
  'hare-sheltering': { name: 'Brown hare sheltering', place: 'Juniper Hollow',
    detail: 'In heavy rain, look for a still, tucked hare beneath a pine or beside a fallen trunk.' },
} as const

export type FieldSubject = keyof typeof fieldSubjects
type RecordId = FieldSubject | `place:${string}`

export interface FieldRecord {
  id: RecordId
  seen?: { time: number; rain: number }
}

export interface FieldJournal {
  heardMara: boolean
  records: FieldRecord[]
}

export const fieldLeads = [
  'Shellglass. Walk Harbor Trail up from the dock and follow the road to the striped market awning. Take Beach Trail past the farm to Driftwood. Where the worn shore track fades into sand, follow the wrack east to my mended tide staff.',
  'Juniper Hollow. Take the worn path between the crew cottages and follow it inland to the low cairn. Keep along the edge of the pines to a clover patch. Stand back and watch where the hares feed.',
] as const

export const rainLead = 'Come back to Juniper in a hard rain. Look beneath the pines and beside the fallen trunks for hares sitting out the shower.'

export function fieldSubject(id: string): id is FieldSubject {
  return Object.hasOwn(fieldSubjects, id)
}

export function knownFieldId(id: unknown): id is RecordId {
  return typeof id === 'string' && (fieldSubject(id) || starterDiscoveries.some(place => id === `place:${place.id}`))
}

export function recordLabel(id: RecordId) {
  if (fieldSubject(id)) return fieldSubjects[id].name
  return starterDiscoveries.find(place => id === `place:${place.id}`)?.name ?? id
}

export function restoreJournal(journal: FieldJournal | undefined, discoveries: readonly string[]): FieldJournal {
  if (journal) return structuredClone(journal)
  return {
    heardMara: false,
    records: [...new Set(discoveries)].flatMap(discovery => {
      const id = `place:${discovery}`
      return knownFieldId(id) ? [{ id }] : []
    }),
  }
}

export function maraFieldLines(journal: FieldJournal): readonly string[] {
  const first = journal.records.find(record => record.seen && fieldSubject(record.id))
  return first && fieldSubject(first.id)
    ? [`I see your crew made a record at ${fieldSubjects[first.id].place}. Good eye.`, ...fieldLeads, rainLead]
    : fieldLeads
}
