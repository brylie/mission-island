import type { Journal } from './journal.ts'

export const outingSubjects = {
  'biome:driftwood-edge': { name: 'Meadow meets the strand', place: 'Driftwood Beach', at: 'driftwood', detail: 'The worn tread fades where turf gives way to pale sand. The line of weed and shell fragments was left by the sea.' },
  'sight:foxglove': { name: 'Common foxglove', place: 'Driftwood Beach', at: 'driftwood', detail: 'Digitalis purpurea. Pink bells hang from tall spikes above a rosette on the sheltered grassy bank.' },
  'place:shellglass': { name: 'Shellglass Tide Pool', place: 'Shellglass Tide Pool', at: 'shellglass', detail: 'The mended tide staff marks the rock basin. Look for the old high-water notch, wet stone and pools that hold water as the wash retreats.' },
  'sight:limpet': { name: 'Common limpet', place: 'Shellglass Tide Pool', at: 'shellglass', detail: 'Patella vulgata. Look for small conical shells clinging to rock on the edge of the pool.' },
  'place:juniper': { name: 'Juniper Hollow', place: 'Juniper Hollow', at: 'juniper', detail: 'A low cairn marks the way from open grass to the pines, fallen wood and tussocks around the clearing.' },
  'sight:clover': { name: 'White clover', place: 'Juniper Hollow', at: 'juniper', detail: 'Trifolium repens. Low groups of three leaflets and pale flower heads mark the patch. Look for closely cropped growth where hares have grazed.' },
  'sight:hare/grazing': { name: 'Brown hare grazing', place: 'Juniper Hollow', at: 'juniper', detail: 'Lepus europaeus. Watch from the edge of the clearing for a long-eared hare lowering its head into the clover.' },
  'sight:hare/sheltering': { name: 'Brown hare sheltering', place: 'Juniper Hollow', at: 'juniper', detail: 'In heavy rain, look for a still, tucked hare beneath a pine or beside a fallen trunk.' },
} as const

export type OutingId = keyof typeof outingSubjects
export const outingIds = Object.keys(outingSubjects) as OutingId[]

export const fieldLeads = [
  'Shellglass. Walk Harbor Trail up from the dock and follow the road to the striped market awning. Take Beach Trail past the farm to Driftwood. Where the worn shore track fades into sand, follow the wrack east to my mended tide staff.',
  'Juniper Hollow. Take the worn path between the crew cottages and follow it inland to the low cairn. Keep along the edge of the pines to a clover patch. Stand back and watch where the hares feed.',
] as const

export const rainLead = 'Come back to Juniper in a hard rain. Look beneath the pines and beside the fallen trunks for hares sitting out the shower.'

export function isOutingId(id: string): id is OutingId {
  return Object.hasOwn(outingSubjects, id)
}

function firstOuting(journal: Journal) {
  return outingIds.filter((id) => journal.entries[id]?.outing)
    .sort((a, b) => journal.entries[a].outing!.t - journal.entries[b].outing!.t)[0]
}

export function outingCount(journal: Journal) {
  return outingIds.filter((id) => journal.entries[id]?.outing).length
}

export function maraFieldLines(journal: Journal): readonly string[] {
  const first = firstOuting(journal)
  return first
    ? [`I see your crew made a record at ${outingSubjects[first].place}. Good eye.`, ...fieldLeads, rainLead]
    : fieldLeads
}
