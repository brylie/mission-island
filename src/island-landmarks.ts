import { clothingCounter, farm, market } from './farm'
import { jobBoard } from './jobs'
import { beach, cottageDoor, crewHomes, extinguisherStarts, ferryTerminal, forest, harbor, lookout, town } from './world'
import type { Point } from './world'
import { landmarkPlacements as layout } from './worlds/starter/layout/places'
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

const half = 0.5
const [firstExtinguisher, secondExtinguisher] = extinguisherStarts
const fireSupplies = { x: (firstExtinguisher.x + secondExtinguisher.x) * half, z: firstExtinguisher.z }

export const landmarks: Landmark[] = [
  { point: { x: harbor.x + layout.harbor.xOffset, z: harbor.z + layout.harbor.zOffset }, title: 'Harbor Depot', kind: 'harbor', height: layout.harbor.height },
  { point: town, title: 'Seabrook', kind: 'town', height: layout.town.height },
  { point: forest, title: 'Pinewoods', kind: 'forest', height: layout.forest.height },
  { point: beach, title: 'Driftwood Beach', kind: 'beach', height: layout.beach.height },
  { point: lookout, title: 'Forest Lookout', kind: 'lookout', height: layout.lookout.height },
  { point: ridgeRack, title: 'Windstone loan rack', kind: 'aviation', height: layout.aviation.height, closeRange: layout.aviation.closeRange },
  { point: farm, title: 'Island Farm', kind: 'farm', height: layout.farm.height },
  { point: market, title: 'Seabrook Market', kind: 'market', height: layout.market.height },
  { point: clothingCounter, title: 'Clothing counter', kind: 'clothing', height: layout.clothing.height, closeRange: layout.clothing.closeRange },
  { point: jobBoard, title: 'Harbor job board', kind: 'board', height: layout.board.height },
  { point: fireSupplies, title: 'Fire Supplies', kind: 'equipment', height: layout.supplies.height },
  { point: ferryTerminal, title: 'Ferry terminal', kind: 'ferry', height: layout.ferry.height },
  { point: materialSources.timber, title: materialSources.timber.name, kind: 'materials-timber', height: layout.rawMaterials.height, closeRange: layout.rawMaterials.closeRange },
  { point: materialSources.stone, title: materialSources.stone.name, kind: 'materials-stone', height: layout.rawMaterials.height, closeRange: layout.rawMaterials.closeRange },
  { point: repairSite, title: repairSite.name, kind: 'materials-repair', height: layout.repair.height, closeRange: layout.repair.closeRange },
  ...crewHomes.flatMap((home, owner) => [
    { point: cottageDoor(home), title: `Your home · ${home.name}`, kind: 'home', height: layout.home.height, owner },
    { point: home.chest, title: 'Your tool chest', kind: 'chest', height: layout.chest.height, owner, closeRange: layout.chest.closeRange },
    { point: home.wardrobe, title: 'Your wardrobe', kind: 'wardrobe', height: layout.wardrobe.height, owner, closeRange: layout.wardrobe.closeRange },
  ]),
]

export function hideLandmark(place: Pick<Landmark, 'kind' | 'owner' | 'closeRange'>, localId: number | undefined, close: boolean, range: number) {
  return (place.owner !== undefined && place.owner !== localId)
    || (place.closeRange !== undefined && (!close || range > place.closeRange))
    || (place.kind === 'ferry' && close && range > layout.ferry.visitRange)
}
