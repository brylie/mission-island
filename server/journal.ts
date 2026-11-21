import { inSkiff } from '../src/actions.ts'
import { journalEntry } from '../src/journal/catalog.ts'
import { fishAt } from '../src/journal/fish.ts'
import { placeNear, recordEntry, type Journal } from '../src/journal/journal.ts'
import { sightingEntries } from '../src/journal/sightings.ts'
import type { Player, Snapshot } from '../src/protocol.ts'
import { northernRegions, starterDiscoveries } from '../src/scenery.ts'
import { distance, type Point } from '../src/world.ts'
import type { IslandSave } from './save.ts'

// A crew that found places before the journal existed keeps them as its first entries.
export function restoreJournal(save: IslandSave | undefined): Journal {
  if (save?.world.journal) return structuredClone(save.world.journal)
  const journal: Journal = {}
  for (const { player } of save?.crew ?? []) {
    for (const id of player.discoveries ?? []) {
      if (journalEntry(`place:${id}`)) recordEntry(journal, `place:${id}`, { t: Math.floor(save!.islandTime), by: player.id, at: placeNear(player) })
    }
  }
  return journal
}

// The crew's shared field journal. Either player adds to it, the first record of anything stands, and each new line is saved at once.
export function createJournal(state: Pick<Snapshot, 'journal' | 'islandTime' | 'driftwood' | 'juniper' | 'weather'>, checkpoint?: () => void) {
  function add(ids: readonly string[], player: Player, where: Point) {
    const at = placeNear(where)
    const note = { t: Math.floor(state.islandTime), by: player.id, ...(at && { at }) }
    const added = ids.filter((id) => recordEntry(state.journal, id, { ...note }))
    if (added.length) checkpoint?.()
    return added
  }

  // The reticle's "Record in journal". The interaction list has already checked the subject is open to this player.
  function record(player: Player, choice: number) {
    const { ids, at } = sightingEntries(state, player, choice)
    if (at) add(ids, player, at)
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
      if (!state.journal[`biome:${region.id}`] && distance(player, region.at) <= region.spread) add([`biome:${region.id}`], player, region.at)
    }
  }

  return { record, landed, explore }
}
