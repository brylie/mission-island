import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createCrew } from '../assets/crew'
import { studioCamera, studioScaleFigure } from '../assets/recipes/workbench-stage'
import type { MeshFactory } from '../island-meshes'
import type { FieldSite } from './field-site'
import type { Entry } from './subject'

const halves = 2

interface Footprint { min: Vector3, extent: Vector3, ground: number, alpha: number }
interface ScaleFigure { height: number, min: Vector3, max: Vector3 }

// Landscapes, on-island sites and fixed-focus studies have no isolated subject to stand beside,
// and the crew study already shows a crew member, so those leave the figure out.
export function scaleFigureFor(meshes: MeshFactory, entry: Entry, field: FieldSite | undefined, footprint: Omit<Footprint, 'alpha'>) {
  if (entry.landscape || field || entry.cameraFocus || entry.id === 'crew') return undefined
  return createScaleFigure(meshes, { ...footprint, alpha: entry.angle ?? studioCamera.alpha })
}

// The production crew member stands to the viewer's left of the subject, square to the entry's own
// camera, so it is beside the subject from that view rather than in front of or behind it.
// It is built the first time it is shown, so subjects that never ask for it pay nothing.
function createScaleFigure(meshes: MeshFactory, { min, extent, ground, alpha }: Footprint) {
  let root: TransformNode | undefined
  let figure: ScaleFigure | undefined
  return (visible: boolean) => {
    if (!visible && !root) return
    if (!root) {
      const side = [Math.sin(alpha), -Math.cos(alpha)]
      const reach = (Math.abs(side[0]) * extent.x + Math.abs(side[1]) * extent.z) / halves + studioScaleFigure.clearance
      root = createCrew(meshes, 0).root
      root.position.set(min.x + extent.x / halves + side[0] * reach, ground, min.z + extent.z / halves + side[1] * reach)
      // Turned toward the camera, which orbits at the entry's perspective angle.
      root.rotation.y = -alpha
      const bounds = root.getHierarchyBoundingVectors(true)
      figure = { height: bounds.max.y - bounds.min.y, ...bounds }
    }
    root.setEnabled(visible)
    return visible ? figure : undefined
  }
}

interface Framing { min: Vector3, max: Vector3, center: Vector3, size: number, ground: number }

// While the figure is shown, the view frames the subject and the figure together, so a person
// beside a small plant reads whole instead of as a cropped giant. Null when the figure is hidden.
export function framingWithFigure(subject: Framing, figure?: ScaleFigure) {
  if (!figure) return undefined
  const low = Vector3.Minimize(subject.min, figure.min)
  const high = Vector3.Maximize(subject.max, figure.max)
  const span = high.subtract(low)
  return {
    scale: Math.max(1, Math.max(span.x, span.z, span.y) / subject.size),
    center: new Vector3((low.x + high.x) / halves, Math.max(subject.center.y, subject.ground + figure.height * studioCamera.aimHeightRatio), (low.z + high.z) / halves),
  }
}

const sizeDecimals = 2
const metres = (value: number) => value.toFixed(sizeDecimals)

interface ScaleStage {
  dimensions?: readonly [number, number, number]
  setScaleFigure?: (visible: boolean) => ScaleFigure | undefined
}

// Shows the crew figure and writes the footer's bounds, with a spoken version for screen readers.
// Views where the figure cannot help (landscapes, on-island sites, fixed-focus studies, the crew itself) hide the toggle.
export function showScaleTools(stage: ScaleStage | undefined, visible: boolean) {
  const toggle = document.getElementById('scale-figure-option')!
  const size = document.getElementById('subject-size')!
  toggle.hidden = !stage?.setScaleFigure
  size.replaceChildren()
  if (!stage?.dimensions) return
  const crew = stage.setScaleFigure?.(visible)?.height
  const [width, depth, height] = stage.dimensions.map(metres)
  const shown = document.createElement('span')
  shown.ariaHidden = 'true'
  shown.textContent = `bounds ${width} × ${depth} × ${height} m (w × d × h)${crew ? ` · crew ${metres(crew)} m` : ''}`
  const spoken = document.createElement('span')
  spoken.className = 'sr-only'
  spoken.textContent = `Bounds of everything shown: width ${width} m, depth ${depth} m, height ${height} m.${crew ? ` Crew member ${metres(crew)} m tall.` : ''}`
  size.append(shown, spoken)
}
