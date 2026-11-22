import { northernRegions, starterDiscoveries } from '../scenery.ts'
import { fishKinds } from './fish.ts'
import { outingSubjects } from './outing.ts'

export type JournalPage = 'fish' | 'places' | 'nature'

// One line of the journal. `clue` is what the page shows until the crew records it.
// A behavior belongs to the animal named by `parent` and is listed under it.
export interface JournalEntry {
  id: string
  page: JournalPage
  name: string
  clue: string
  parent?: string
}

const placeClues: Record<string, string> = {
  juniper: 'A pine hollow in the north-west.',
  fernfall: 'Where the northern stream drops over its ledges.',
  pool: 'Still water north of the falls.',
  ridge: 'The windy headland at the far north.',
  shellglass: 'A tide pool east along the Driftwood shore.',
  splitstone: 'A cleft in the sandstone on the east shore.',
}

// What the reticle can record, in a fixed order: an interaction names its subject by this index.
export const journalSubjects = [
  { id: 'sight:school', page: 'nature', name: 'Driftwood fish school', clue: 'Something silver moves in the Driftwood shallows.', behaviors: { regrouping: 'Regrouping after a scare' } },
  { id: 'sight:hare', page: 'nature', name: 'Brown hare', clue: 'Long ears among the Juniper Hollow clover.', behaviors: { grazing: 'Grazing', fleeing: 'Fleeing', sheltering: 'Sheltering' } },
  { id: 'sight:fox', page: 'nature', name: 'Juniper fox', clue: 'A red coat on the edge of the Juniper Hollow clearing.', behaviors: { patrolling: 'Patrolling', watching: 'Watching' } },
  { id: 'sight:gull', page: 'nature', name: 'Dock gull', clue: 'White birds keep to the harbor dock piles.', behaviors: { resting: 'Resting on a pile', gliding: 'Gliding over the water' } },
  { id: 'sight:willow', page: 'nature', name: 'Fallen willow', clue: 'A tree lies on the east bank of Mirror Pool.', behaviors: {} },
  { id: 'sight:clover', page: 'nature', name: 'White clover', clue: 'Low green leaves the Juniper hares feed on.', behaviors: {} },
  { id: 'sight:lookout', page: 'places', name: 'Forest Lookout', clue: 'A tower above the pinewoods.', behaviors: {} },
  { id: 'sight:ferry', page: 'places', name: 'Ferry terminal', clue: 'A closed ramp east of Harbor Depot.', behaviors: {} },
] as const satisfies readonly (JournalEntry & { behaviors: Record<string, string> })[]

export type SubjectId = typeof journalSubjects[number]['id']

export function behaviorId(subject: string, behavior: string) {
  return `${subject}/${behavior}`
}

// Everything the journal lists, in page order.
export const journalCatalog: readonly JournalEntry[] = [
  ...fishKinds.map((fish) => ({ ...fish, page: 'fish' as const })),
  ...starterDiscoveries.map(({ id, name }) => ({ id: `place:${id}`, page: 'places' as const, name, clue: placeClues[id] ?? 'A place not yet visited.' })),
  ...northernRegions.map(({ id, biome }) => ({ id: `biome:${id}`, page: 'places' as const, name: biome, clue: 'Country in the north that nobody has walked yet.' })),
  ...journalSubjects.flatMap(({ behaviors, ...subject }) => [
    subject,
    ...Object.entries(behaviors).map(([key, name]) => ({ id: behaviorId(subject.id, key), page: subject.page, name, clue: 'Seen doing something else.', parent: subject.id })),
  ]),
  { id: 'biome:driftwood-edge', page: 'places', name: outingSubjects['biome:driftwood-edge'].name, clue: 'Look where the worn trail meets the sand.' },
  { id: 'sight:foxglove', page: 'nature', name: outingSubjects['sight:foxglove'].name, clue: 'Look for tall pink bells on the grass above Driftwood.' },
  { id: 'sight:limpet', page: 'nature', name: outingSubjects['sight:limpet'].name, clue: 'Look for small shells clinging to rock near the tide staff.' },
]

const byId = new Map(journalCatalog.map((entry) => [entry.id, entry]))

export function journalEntry(id: string) {
  return byId.get(id)
}
