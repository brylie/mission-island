import { farm } from '../farm.ts'
import { shellglassPoint, splitstone } from '../routes.ts'
import { northernRegions } from '../scenery.ts'
import { daySeconds, isNight, weatherAt } from '../weather.ts'
import { beach, distance, ferryTerminal, forest, harbor, harborDock, lookout, town, type Point } from '../world.ts'
import { journalCatalog, type JournalPage } from './catalog.ts'

const northernRegionDiscoveryMarginM = 4
const smallSiteDiscoveryRangeM = 9
const dockDiscoveryZM = -34
const dockDiscoveryRangeM = 12
const harborDiscoveryRangeM = 18
const townDiscoveryRangeM = 20
const lookoutDiscoveryRangeM = 10
const forestDiscoveryRangeM = 22
const beachDiscoveryRangeM = 26
const morningEndsAtHour = 10
const middayEndsAtHour = 14
const heavyRainThreshold = 0.65
const rainThreshold = 0.3

export interface JournalNote { t: number, by?: number, at?: string, rain?: number }
export interface JournalRecord {
  first?: JournalNote
  outing?: JournalNote
}
export interface Journal {
  version: 1
  heardMara: boolean
  entries: Record<string, JournalRecord>
}

export function emptyJournal(): Journal {
  return { version: 1, heardMara: false, entries: {} }
}

// An inspection can finish the outing even if the place or subject is already known.
export function recordEntry(journal: Journal, id: string, note: JournalNote, kind: 'first' | 'outing' = 'first') {
  const existing = journal.entries[id]
  if (!existing) journal.entries[id] = { [kind]: note }
  else if (kind === 'outing' && !existing.outing) existing.outing = note
  else return false
  return true
}

export function journalTally(journal: Journal) {
  const pages: Record<JournalPage, { recorded: number, total: number }> = {
    fish: { recorded: 0, total: 0 },
    places: { recorded: 0, total: 0 },
    nature: { recorded: 0, total: 0 },
  }
  for (const { id, page } of journalCatalog) {
    pages[page].total++
    if (journal.entries[id]) pages[page].recorded++
  }
  const all = Object.values(pages)
  return { pages, recorded: all.reduce((sum, page) => sum + page.recorded, 0), total: journalCatalog.length }
}

const namedPlaces: readonly { key: string, name: string, point: Point, range: number }[] = [
  // A region's signpost can stand just past its scatter of trees and stones, so its name reaches a little further.
  ...northernRegions.map(({ id, name, at, spread }) => ({ key: id, name, point: at, range: spread + northernRegionDiscoveryMarginM })),
  { key: 'shellglass', name: 'Shellglass Tide Pool', point: shellglassPoint, range: smallSiteDiscoveryRangeM },
  { key: 'splitstone', name: 'Splitstone Narrows', point: splitstone, range: smallSiteDiscoveryRangeM },
  { key: 'dock', name: 'Harbor dock', point: { x: harborDock.x, z: dockDiscoveryZM }, range: dockDiscoveryRangeM },
  { key: 'ferry', name: 'Ferry terminal', point: ferryTerminal, range: smallSiteDiscoveryRangeM },
  { key: 'harbor', name: 'Harbor Depot', point: harbor, range: harborDiscoveryRangeM },
  { key: 'seabrook', name: 'Seabrook', point: town, range: townDiscoveryRangeM },
  { key: 'lookout', name: 'Forest Lookout', point: lookout, range: lookoutDiscoveryRangeM },
  { key: 'pinewoods', name: 'Pinewoods', point: forest, range: forestDiscoveryRangeM },
  { key: 'farm', name: 'Island Farm', point: farm, range: smallSiteDiscoveryRangeM },
  { key: 'driftwood', name: 'Driftwood Beach', point: beach, range: beachDiscoveryRangeM },
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
export function noteConditions({ t, rain: recordedRain }: JournalNote) {
  const { hour, rain: inferredRain } = weatherAt(t)
  const rain = recordedRain ?? inferredRain
  const time = isNight(hour) ? 'night' : hour < morningEndsAtHour ? 'morning' : hour < middayEndsAtHour ? 'midday' : 'afternoon'
  const conditions = rain >= heavyRainThreshold && recordedRain !== undefined ? 'heavy rain' : rain >= rainThreshold ? 'rain' : ''
  return [`Day ${Math.floor(t / daySeconds) + 1}`, time, conditions].filter(Boolean).join(' · ')
}
