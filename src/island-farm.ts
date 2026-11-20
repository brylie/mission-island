import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { farmPlots, plotSize } from './farm'
import type { PlotStage } from './farm'
import type { MeshFactory } from './island-meshes'
import { groundHeight } from './terrain'

function mergeParts(name: string, parts: Mesh[], pivot: TransformNode) {
  const mesh = Mesh.MergeMeshes(parts, true, true)
  if (mesh) {
    mesh.name = name
    mesh.setParent(pivot)
  }
}

export function createFarm({ scene, box, sphere, paintSurface }: MeshFactory, points = farmPlots) {
  const dry = paintSurface('gravel', '#98704f')
  const wet = paintSurface('gravel', '#6e4a38')
  const plots = points.map((point) => {
    const root = new TransformNode('Farm plot', scene)
    root.position.set(point.x, groundHeight(point), point.z)
    const earth = box(0, 0.025, 0, plotSize, 0.05, plotSize, '#788e62', root, false)
    for (const edge of [-1, 1]) {
      box(edge * (plotSize / 2 + 0.039), 0.054, 0, 0.066, 0.081, plotSize + 0.17, '#aa8562', root)
      box(0, 0.054, edge * (plotSize / 2 + 0.037), plotSize, 0.081, 0.066, '#aa8562', root)
    }
    const rows = new TransformNode('Carrot rows', scene)
    rows.parent = root
    const furrows = [-0.49, 0, 0.49].map((x) => box(x, 0.053, 0, 0.095, 0.03, 1.34, '#694935', rows, false))
    const shoots = new TransformNode('Carrots', scene)
    shoots.parent = root
    const crowns = new TransformNode('Carrot crowns', scene)
    crowns.parent = shoots
    const roots: Mesh[] = []
    const leaves: Mesh[] = []
    for (const x of [-0.47, 0, 0.47]) {
      for (const z of [-0.46, 0, 0.46]) {
        roots.push(sphere(x, 0.073, z, 0.131, 0.11, 0.131, '#e89951', crowns, false, 5))
        for (const side of [-1, 1]) {
          const leaf = sphere(x + side * 0.038, 0.14, z, 0.048, 0.18, 0.052, '#6ba463', shoots, false, 5)
          leaf.rotation.z = side * 0.42
          leaves.push(leaf)
        }
      }
    }
    mergeParts('Furrows', furrows, rows)
    mergeParts('Carrot tops', leaves, shoots)
    mergeParts('Carrot shoulders', roots, crowns)
    return { earth, rows, shoots, crowns, initial: earth.material, stage: undefined as PlotStage | undefined }
  })
  return (farm: readonly PlotStage[]) => {
    for (const [i, plot] of plots.entries()) {
      const stage = farm[i] ?? 'grass'
      if (plot.stage === stage) continue
      plot.stage = stage
      plot.earth.material = stage === 'grass' ? plot.initial : stage === 'watered' ? wet : dry
      plot.rows.setEnabled(stage !== 'grass')
      plot.shoots.setEnabled(stage === 'planted' || stage === 'watered' || stage === 'ripe')
      plot.shoots.scaling.y = stage === 'ripe' ? 1.38 : 0.78
      plot.crowns.setEnabled(stage === 'ripe')
    }
  }
}
