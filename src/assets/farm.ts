import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { MeshFactory } from '../island-meshes'
import { groundHeight, walkingHeight } from '../terrain'
import type { Point, Pose } from '../world'

import { farmOrderSignGeometry, farmPlotGeometry } from './geometry/farm'

function mergeParts(name: string, parts: Mesh[], pivot: TransformNode) {
  const mesh = Mesh.MergeMeshes(parts, true, true)
  if (mesh) {
    mesh.name = name
    mesh.setParent(pivot)
  }
}

const { furrow } = farmPlotGeometry
const halfSpan = 0.5
export const farmFurrowTop = furrow.centreY + furrow.size[1] * halfSpan

export function createFarmPlotModels({ scene, box, sphere, paintSurface }: MeshFactory, points: readonly Point[], plotSize: number, heightAt = groundHeight) {
  const { earth: bed, edging, carrot, cultivatedSoil } = farmPlotGeometry
  const dry = paintSurface('gravel', cultivatedSoil.dry)
  const wet = paintSurface('gravel', cultivatedSoil.wet)
  const plots = points.map((point) => {
    const root = new TransformNode('Farm plot', scene)
    root.position.set(point.x, heightAt(point), point.z)
    const earth = box(0, bed.centreY, 0, plotSize, bed.height, plotSize, bed.color, root, false)
    for (const edge of [-1, 1]) {
      box(edge * (plotSize * halfSpan + edging.xMargin), edging.centreY, 0, edging.thickness, edging.height, plotSize + edging.sideExtension, edging.color, root)
      box(0, edging.centreY, edge * (plotSize * halfSpan + edging.zMargin), plotSize, edging.height, edging.thickness, edging.color, root)
    }
    const rows = new TransformNode('Carrot rows', scene)
    rows.parent = root
    const furrows = furrow.rows.map((x) => box(x, furrow.centreY, 0, ...furrow.size, furrow.color, rows, false))
    const shoots = new TransformNode('Carrots', scene)
    shoots.parent = root
    const crowns = new TransformNode('Carrot crowns', scene)
    crowns.parent = shoots
    const roots: Mesh[] = []
    const leaves: Mesh[] = []
    for (const x of carrot.rows) {
      for (const z of carrot.columns) {
        roots.push(sphere(x, carrot.crown.centreY, z, ...carrot.crown.size, carrot.crown.color, crowns, false, carrot.segments))
        for (const side of [-1, 1]) {
          const leaf = sphere(x + side * carrot.leaf.offset, carrot.leaf.centreY, z, ...carrot.leaf.size, carrot.leaf.color, shoots, false, carrot.segments)
          leaf.rotation.z = side * carrot.leaf.tilt
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
  const { post, board, timber, face: panel, label: print } = farmOrderSignGeometry
  box(0, post.centreY, 0, ...post.size, timber, root)
  box(0, board.centreY, 0, ...board.size, timber, root)
  const label = new DynamicTexture(text, { width: print.width, height: print.height }, scene, true)
  label.drawText(text, null, print.baseline, print.font, print.ink, print.background, true)
  const face = new StandardMaterial(text, scene)
  face.diffuseTexture = label
  face.emissiveTexture = label
  face.backFaceCulling = false
  for (const side of [-1, 1]) {
    const left = side * panel.halfWidth, z = side * panel.halfDepth
    surface(`${text} face`, [left, panel.lowerY, z, -left, panel.lowerY, z, -left, panel.upperY, z, left, panel.upperY, z], [...panel.indices], face, root, [...panel.uvs])
  }
  return root
}
