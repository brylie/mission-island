import { createFarmPlotModels } from './assets/farm'
import { farmPlots, plotSize, type PlotStage } from './farm'
import type { MeshFactory } from './island-meshes'

const ripeShootScale = 1.38
const youngShootScale = 0.78

export function createFarm(meshes: MeshFactory, points = farmPlots) {
  const { plots, dry, wet } = createFarmPlotModels(meshes, points, plotSize)
  const stages: (PlotStage | undefined)[] = []
  return (farm: readonly PlotStage[]) => {
    for (const [i, plot] of plots.entries()) {
      const stage = farm[i] ?? 'grass'
      if (stages[i] === stage) continue
      stages[i] = stage
      plot.earth.material = stage === 'grass' ? plot.initial : stage === 'watered' ? wet : dry
      plot.rows.setEnabled(stage !== 'grass')
      plot.shoots.setEnabled(stage === 'planted' || stage === 'watered' || stage === 'ripe')
      plot.shoots.scaling.y = stage === 'ripe' ? ripeShootScale : youngShootScale
      plot.crowns.setEnabled(stage === 'ripe')
    }
  }
}
