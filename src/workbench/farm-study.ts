import { createFarm } from '../island-farm'
import { farmPlots } from '../farm'
import type { PlotStage } from '../farm'
import { control, type Entry } from './subject'

export const farmStudy: Entry = {
  id: 'farm', name: 'Carrot plots', group: 'Farming', source: 'src/island-farm.ts',
  fieldSite: () => ({ name: 'Carrot farm', offset: { x: 0, y: 0, z: 0 }, replaceFarm: true }),
  description: 'Compare soil and carrot growth through each stage of the crop.',
  controls: [control('plot', 'Growth stage', 'ripe', { grass: 'Grass', tilled: 'Tilled', planted: 'Planted', watered: 'Watered', ripe: 'Ripe' })],
  create(meshes, values) {
    const show = createFarm(meshes)
    let stage = values.plot as PlotStage
    const poses = farmPlots.map(() => stage)
    show(poses)
    return (_, settings) => {
      if (settings.plot === stage) return
      stage = settings.plot as PlotStage
      show(poses.fill(stage))
    }
  },
}
