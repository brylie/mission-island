import { inSkiff } from '../src/actions.ts'
import { fieldInteractions, type FieldAction } from '../src/field-interactions.ts'
import { journalEntry } from '../src/journal/catalog.ts'
import { fishAt } from '../src/journal/fish.ts'
import { emptyJournal, placeNear, recordEntry, type Journal, type JournalNote } from '../src/journal/journal.ts'
import { outingSubjects } from '../src/journal/outing.ts'
import { sightingEntries, type SightingAction } from '../src/journal/sightings.ts'
import type { Player, Snapshot } from '../src/protocol.ts'
import { northernRegions, starterDiscoveries } from '../src/scenery.ts'
import { distance, type Point } from '../src/world.ts'
import type { IslandSave } from './save.ts'
import type { CrewMember } from './crew.ts'
import type { InteractionHandlers } from './interactions.ts'

// A crew that found places before the journal existed keeps them as its first entries.
export function restoreJournal(save: IslandSave | undefined): Journal {
  if (save?.world.journal) return structuredClone(save.world.journal)
  const journal = emptyJournal()
  for (const { player } of save?.crew ?? []) {
    for (const id of Array.isArray(player.discoveries) ? player.discoveries : []) {
      const key = `place:${id}`
      if (journalEntry(key)) journal.entries[key] ??= {}
    }
  }
  return journal
}

// The crew's shared field journal. Either player adds to it, the first record of anything stands, and each new line is saved at once.
export function createJournal(state: Pick<Snapshot, 'journal' | 'islandTime' | 'driftwood' | 'juniper' | 'weather' | 'farmWork'>, checkpoint?: () => void) {
  function add(ids: readonly string[], player: Player, where: Point) {
    const at = placeNear(where)
    const note = { t: Math.floor(state.islandTime), by: player.id, ...(at && { at }) }
    const added = ids.filter((id) => recordEntry(state.journal, id, note))
    if (added.length) checkpoint?.()
    return added
  }

  // The reticle's "Record in journal". The interaction list has already checked the subject is open to this player.
  function record(player: Player, choice: number) {
    const { ids, at } = sightingEntries(state, player, choice)
    if (at) add(ids, player, at)
  }

  function inspect(member: CrewMember, subject: number) {
    const option = fieldInteractions(state, member.player).find(choice => choice.subject === subject)
    if (!option) return member.notify?.({ type: 'field-unavailable' })
    const { record: id } = option
    const note: JournalNote = {
      t: state.islandTime, by: member.player.id, at: outingSubjects[id].at, rain: state.weather.rain,
    }
    if (recordEntry(state.journal, id, note, 'outing')) {
      const parent = journalEntry(id)?.parent
      if (parent) recordEntry(state.journal, parent, note)
      checkpoint?.()
    }
    if (id === 'place:shellglass') member.notify?.({ type: 'tide-staff', time: note.t })
  }

  function hearMara() {
    state.journal.heardMara = true
  }

  // A landed fish is named by where and when the bait sat, and noted the first time the crew lands one.
  function landed(player: Player, bobber: Point) {
    const fish = fishAt(bobber, state.islandTime, inSkiff(player.seat))
    // The note names where the angler stood, which is how the crew will find the water again.
    add([fish], player, player)
    return fish
  }

  // Walking up to a named place reveals it on that player's own map and notes it for the crew.
  // Walking into a region notes its kind of country.
  function explore(player: Player) {
    for (const place of starterDiscoveries) {
      if (player.discoveries.includes(place.id) || distance(player, place.site) >= 8) continue
      player.discoveries.push(place.id)
      if (!add([`place:${place.id}`], player, place.site).length) checkpoint?.()
    }
    for (const region of northernRegions) {
      if (!state.journal.entries[`biome:${region.id}`] && distance(player, region.at) <= region.spread) {
        add([`biome:${region.id}`], player, region.at)
      }
    }
  }

  const interactions = {
    record: ({ player }, subject) => record(player, subject),
    'inspect-field': inspect,
  } satisfies InteractionHandlers<FieldAction | SightingAction>
  return { interactions, hearMara, landed, explore }
}
