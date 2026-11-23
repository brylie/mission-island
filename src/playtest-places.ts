import { fireFinder, fireWatchEntrance } from './fire-watch.ts'
import type { Point } from './world.ts'
import { capturePresets } from './assets/recipes/capture-presets.ts'
import { highwoodPlaces } from './worlds/starter/layout/island-generation.ts'

// Somewhere to stand beside the fire finder, clear of its post.
const deckStandM = 1.2

// Places a playtest can send a crewmate to, so a tester can stand where a hero
// view or a review needs them without walking there.
export const playtestPlaces: readonly { id: string, label: string, point: Point, heading?: number }[] = [
  { id: 'fire-watch-stairs', label: 'Fire Watch stairs', point: fireWatchEntrance },
  { id: 'fire-watch-deck', label: 'Fire Watch deck', point: { x: fireFinder.x + deckStandM, z: fireFinder.z } },
  { id: 'cairn-summit', label: 'Cairn Summit', point: highwoodPlaces.cairnCrown },
  { id: 'fallow-ridge', label: 'Fallow Ridge', point: highwoodPlaces.fallowRidge },
  { id: 'pine-draw', label: 'Pine Draw', point: highwoodPlaces.pineDraw },
  { id: 'bracken', label: 'Bracken Meadow', point: highwoodPlaces.bracken },
  { id: 'birch-flats', label: 'Birch Flats', point: highwoodPlaces.birchFlats },
  { id: 'alder-creek', label: 'Alder Creek head', point: highwoodPlaces.creekHead },
  // Highwood's hero views: stand at the view's eye, facing what it looks at.
  ...Object.entries(capturePresets).flatMap(([id, preset]) => id.startsWith('highwood-') && preset.kind === 'landscape'
    ? [{ id, label: `Hero: ${preset.label}`, point: preset.eye, heading: Math.atan2(preset.look.x - preset.eye.x, preset.look.z - preset.eye.z) }]
    : []),
]
