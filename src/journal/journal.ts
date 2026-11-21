import { farm } from '../farm.ts'
import { shellglassPoint, splitstone } from '../routes.ts'
import { northernRegions } from '../scenery.ts'
import { daySeconds, isNight, weatherAt } from '../weather.ts'
import { beach, distance, ferryTerminal, forest, harbor, harborDock, lookout, town, type Point } from '../world.ts'
import { journalCatalog, type JournalPage } from './catalog.ts'

// When an entry was first recorded, by which seat and, if it has a name, where.
// The weather is not stored: it follows from the island time.
export interface JournalNote { t: number; by: number; at?: string }
export type Journal = Record<string, JournalNote>

// The first record stands. A later one returns nothing and changes nothing.
export function recordEntry(journal: Journal, id: string, note: JournalNote) {
  if (journal[id]) return undefined
  journal[id] = note
  return note
}

export function journalTally(journal: Journal) {
  const pages: Record<JournalPage, { recorded: number; total: number }> = {
    fish: { recorded: 0, total: 0 }, places: { recorded: 0, total: 0 }, nature: { recorded: 0, total: 0 },
  }
  for (const { id, page } of journalCatalog) {
    pages[page].total++
    if (journal[id]) pages[page].recorded++
  }
  const all = Object.values(pages)
  return { pages, recorded: all.reduce((sum, page) => sum + page.recorded, 0), total: journalCatalog.length }
}

const namedPlaces: readonly { key: string; name: string; point: Point; range: number }[] = [
  // A region's signpost can stand just past its scatter of trees and stones, so its name reaches a little further.
  ...northernRegions.map(({ id, name, at, spread }) => ({ key: id, name, point: at, range: spread + 4 })),
  { key: 'shellglass', name: 'Shellglass Tide Pool', point: shellglassPoint, range: 9 },
  { key: 'splitstone', name: 'Splitstone Narrows', point: splitstone, range: 9 },
  { key: 'dock', name: 'Harbor dock', point: { x: harborDock.x, z: -34 }, range: 12 },
  { key: 'ferry', name: 'Ferry terminal', point: ferryTerminal, range: 9 },
  { key: 'harbor', name: 'Harbor Depot', point: harbor, range: 18 },
  { key: 'seabrook', name: 'Seabrook', point: town, range: 20 },
  { key: 'lookout', name: 'Forest Lookout', point: lookout, range: 10 },
  { key: 'pinewoods', name: 'Pinewoods', point: forest, range: 22 },
  { key: 'farm', name: 'Island Farm', point: farm, range: 9 },
  { key: 'driftwood', name: 'Driftwood Beach', point: beach, range: 26 },
]

// The named place a point lies in, if any. Where two overlap, the one whose middle is closer wins.
export function placeNear(point: Point) {
  let best: string | undefined
  let nearest = Infinity
  for (const { key, point: middle, range } of namedPlaces) {
    const away = distance(point, middle)
    if (away <= range && away / range < nearest) {
      best = key
      nearest = away / range
    }
  }
  return best
}

export function placeName(key: string | undefined) {
  return namedPlaces.find((place) => place.key === key)?.name
}

// The pencil note under a recorded entry, for example "Day 3 · afternoon · rain".
export function noteConditions({ t }: JournalNote) {
  const { hour, rain } = weatherAt(t)
  const time = isNight(hour) ? 'night' : hour < 10 ? 'morning' : hour < 14 ? 'midday' : 'afternoon'
  return [`Day ${Math.floor(t / daySeconds) + 1}`, time, ...(rain >= .3 ? ['rain'] : [])].join(' · ')
}
