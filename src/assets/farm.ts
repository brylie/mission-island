import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { MeshFactory } from '../island-meshes'
import { groundHeight, walkingHeight } from '../terrain'
import type { Point, Pose } from '../world'

function mergeParts(name: string, parts: Mesh[], pivot: TransformNode) {
  const mesh = Mesh.MergeMeshes(parts, true, true)
  if (mesh) {
    mesh.name = name
    mesh.setParent(pivot)
  }
}

export function createFarmPlotModels({ scene, box, sphere, paintSurface }: MeshFactory, points: readonly Point[], plotSize: number) {
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
    return { earth, rows, shoots, crowns, initial: earth.material }
  })
  return { plots, dry, wet }
}

export function createFarmOrderSign({ scene, box, surface }: MeshFactory, pose: Pose, text: string) {
  const root = new TransformNode(text, scene)
  root.position.set(pose.x, walkingHeight(pose), pose.z)
  root.rotation.y = pose.heading
  box(0, 0.48, 0, 0.075, 0.96, 0.075, '#6a5039', root)
  box(0, 0.93, 0, 1.05, 0.32, 0.1, '#6a5039', root)
  const label = new DynamicTexture(text, { width: 512, height: 128 }, scene, true)
  label.drawText(text, null, 85, 'bold 62px sans-serif', '#fcebd0', '#325b50', true)
  const face = new StandardMaterial(text, scene)
  face.diffuseTexture = label
  face.emissiveTexture = label
  face.backFaceCulling = false
  for (const side of [-1, 1]) {
    const left = side * 0.495, z = side * 0.052
    surface(`${text} face`, [left, 0.805, z, -left, 0.805, z, -left, 1.055, z, left, 1.055, z], [0, 1, 2, 0, 2, 3], face, root, [0, 0, 1, 0, 1, 1, 0, 1])
  }
  return root
}
