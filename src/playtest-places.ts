import { fireFinder, fireWatchEntrance } from './fire-watch.ts'
import type { Point } from './world.ts'
import { highwoodHeroViews } from './worlds/starter/layout/hero-views.ts'
import { highwoodPlaces } from './worlds/starter/layout/island-generation.ts'

// Somewhere to stand beside the fire finder, clear of its post.
const deckStandM = 1.2

// Places a playtest can send a crewmate to, so a tester can stand where a hero
// view or a review needs them without walking there.
export const playtestPlaces: readonly { id: string, label: string, point: Point }[] = [
  { id: 'fire-watch-stairs', label: 'Fire Watch stairs', point: fireWatchEntrance },
  { id: 'fire-watch-deck', label: 'Fire Watch deck', point: { x: fireFinder.x + deckStandM, z: fireFinder.z } },
  { id: 'cairn-summit', label: 'Cairn Summit', point: highwoodPlaces.cairnSummit },
  { id: 'fallow-ridge', label: 'Fallow Ridge', point: highwoodPlaces.fallowRidge },
  { id: 'pine-draw', label: 'Pine Draw', point: highwoodPlaces.pineDraw },
  { id: 'bracken', label: 'Bracken Meadow', point: highwoodPlaces.bracken },
  { id: 'birch-flats', label: 'Birch Flats', point: highwoodPlaces.birchFlats },
  { id: 'alder-creek', label: 'Alder Creek head', point: highwoodPlaces.creekHead },
  ...highwoodHeroViews.map(({ id, label, eye }) => ({ id, label: label.replace('Hero · ', 'Hero view: '), point: eye })),
]
