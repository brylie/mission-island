import { starterBuildingReview } from '../assets/recipes/workbench-building-vehicle-studies'
import { createHouse } from '../assets/buildings'
import { buildings } from '../world'
import { starterResidents } from '../worlds/starter/residents'
import { control, type Entry } from './subject'

export const houseStudy: Entry = {
  id: 'house',
  name: 'Island houses',
  group: 'Starter buildings',
  source: 'src/assets/buildings.ts',
  angle: starterBuildingReview.angle,
  fieldSite: (values) => {
    const index = Number(values.variant)
    return { name: 'Starter Island', offset: { ...buildings[index], y: 0 }, replaceBuilding: index }
  },
  description: 'Inspect the exterior, windows, roofline, and foundation of each building.',
  controls: [control('variant', 'Building', '0', Object.fromEntries(starterBuildingReview.names.entries()), true)],
  create(meshes, values) {
    const building = buildings[Number(values.variant)]
    const household = starterResidents.find(({ schedule }) => schedule.household.building === building)?.schedule.household
    createHouse(meshes, { ...building, x: 0, z: 0 }, household)
  },
}
