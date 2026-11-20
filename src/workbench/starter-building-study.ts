import { createHouse } from '../assets/buildings'
import { buildings } from '../world'
import { control, type Entry } from './subject'

export const houseStudy: Entry = {
  id: 'house', name: 'Island houses', group: 'Starter buildings', source: 'src/assets/buildings.ts', angle: -0.98,
  fieldSite: values => {
    const index = Number(values.variant)
    return { name: 'Starter Island', offset: { ...buildings[index], y: 0 }, replaceBuilding: index }
  },
  description: 'Inspect the exterior, windows, roofline, and foundation of each building.',
  controls: [control('variant', 'Building', '0', {
    0: 'Harbor Depot', 1: 'Harbor workshop', 2: 'Seabrook house', 3: 'Seabrook brick house',
    4: 'Seabrook cottage', 5: 'Seabrook shop', 6: 'Seabrook teal house', 7: 'Fire supplies', 8: 'Forest Lookout',
    9: 'Amber crew home', 10: 'Blue crew home',
  }, true)],
  create(meshes, values) { createHouse(meshes, { ...buildings[Number(values.variant)], x: 0, z: 0 }) },
}
