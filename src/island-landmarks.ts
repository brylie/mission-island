import { clothingCounter, farm, market } from './farm'
import { jobBoard } from './jobs'
import { beach, cottageDoor, crewHomes, ferryTerminal, forest, harbor, lookout, town } from './world'
import type { Point } from './world'
import { ridgeRack } from './worlds/starter/ridge-scout'
import { materialSources, repairSite } from './worlds/starter/materials'

interface Landmark {
  point: Point
  title: string
  kind: string
  height: number
  owner?: number
  closeRange?: number
}

export const landmarks: Landmark[] = [
  { point: { x: harbor.x + 1.3, z: harbor.z - 5 }, title: 'Harbor Depot', kind: 'harbor', height: 4 },
  { point: town, title: 'Seabrook', kind: 'town', height: 2.6 },
  { point: forest, title: 'Pinewoods', kind: 'forest', height: 7 },
  { point: beach, title: 'Driftwood Beach', kind: 'beach', height: 2.2 },
  { point: lookout, title: 'Forest Lookout', kind: 'lookout', height: 4.3 },
  { point: ridgeRack, title: 'Windstone loan rack', kind: 'aviation', height: 2.8, closeRange: 26 },
  { point: farm, title: 'Island Farm', kind: 'farm', height: 1.32 },
  { point: market, title: 'Seabrook Market', kind: 'market', height: 3.32 },
  { point: clothingCounter, title: 'Clothing counter', kind: 'clothing', height: 1.48, closeRange: 16 },
  { point: jobBoard, title: 'Harbor job board', kind: 'board', height: 2.35 },
  { point: { x: 21, z: 22 }, title: 'Fire Supplies', kind: 'equipment', height: 2.4 },
  { point: ferryTerminal, title: 'Ferry terminal', kind: 'ferry', height: 2.1 },
  { point: materialSources.timber, title: materialSources.timber.name, kind: 'materials-timber', height: 1.16, closeRange: 18 },
  { point: materialSources.stone, title: materialSources.stone.name, kind: 'materials-stone', height: 1.16, closeRange: 18 },
  { point: repairSite, title: repairSite.name, kind: 'materials-repair', height: 1.55, closeRange: 22 },
  ...crewHomes.flatMap((home, owner) => [
    { point: cottageDoor(home), title: `Your home · ${home.name}`, kind: 'home', height: 2.5, owner },
    { point: home.chest, title: 'Your tool chest', kind: 'chest', height: 0.95, owner, closeRange: 12 },
    { point: home.wardrobe, title: 'Your wardrobe', kind: 'wardrobe', height: 2.09, owner, closeRange: 12 },
  ]),
]

export function hideLandmark(place: Pick<Landmark, 'kind' | 'owner' | 'closeRange'>, localId: number | undefined, close: boolean, range: number) {
  return (place.owner !== undefined && place.owner !== localId) ||
    (place.closeRange !== undefined && (!close || range > place.closeRange)) ||
    (place.kind === 'ferry' && close && range > 38)
}
