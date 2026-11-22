import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createCrew } from '../assets/crew'
import { studioScaleFigure } from '../assets/recipes/workbench-stage'
import type { MeshFactory } from '../island-meshes'

interface Footprint { maxX: number, minZ: number, ground: number }

// The production crew member stands off the subject's +x, −z corner, which sits beside it rather than
// behind it from the default three-quarter view, so its size reads against a person.
// It is built the first time it is shown, so subjects that never ask for it pay nothing.
export function createScaleFigure(meshes: MeshFactory, footprint: Footprint) {
  let root: TransformNode | undefined
  return (visible: boolean) => {
    if (!visible && !root) return
    if (!root) {
      root = createCrew(meshes, 0).root
      root.position.set(footprint.maxX + studioScaleFigure.clearance, footprint.ground, footprint.minZ - studioScaleFigure.clearance)
      root.rotation.y = studioScaleFigure.facing
    }
    root.setEnabled(visible)
  }
}
