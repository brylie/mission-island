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
  let height = 0
  return (visible: boolean) => {
    if (!visible && !root) return
    if (!root) {
      root = createCrew(meshes, 0).root
      root.position.set(footprint.maxX + studioScaleFigure.clearance, footprint.ground, footprint.minZ - studioScaleFigure.clearance)
      root.rotation.y = studioScaleFigure.facing
      const { min, max } = root.getHierarchyBoundingVectors(true)
      height = max.y - min.y
    }
    root.setEnabled(visible)
    return visible ? height : undefined
  }
}

const sizeDecimals = 2
const metres = (value: number) => value.toFixed(sizeDecimals)

interface ScaleStage {
  dimensions?: readonly [number, number, number]
  setScaleFigure: (visible: boolean) => number | undefined
}

// Shows the crew figure and writes the footer's bounds, with a spoken version for screen readers.
// Views without isolated bounds (landscapes, on-island sites) hide the toggle, since it would do nothing there.
export function showScaleTools(stage: ScaleStage | undefined, visible: boolean) {
  const toggle = document.getElementById('scale-figure-option')!
  const size = document.getElementById('subject-size')!
  toggle.hidden = !stage?.dimensions
  size.replaceChildren()
  if (!stage?.dimensions) return
  const crew = stage.setScaleFigure(visible)
  const [width, depth, height] = stage.dimensions.map(metres)
  const shown = document.createElement('span')
  shown.ariaHidden = 'true'
  shown.textContent = `bounds ${width} × ${depth} × ${height} m (w × d × h)${crew ? ` · crew ${metres(crew)} m` : ''}`
  const spoken = document.createElement('span')
  spoken.className = 'sr-only'
  spoken.textContent = `Bounds of everything shown: width ${width} m, depth ${depth} m, height ${height} m.${crew ? ` Crew member ${metres(crew)} m tall.` : ''}`
  size.append(shown, spoken)
}
