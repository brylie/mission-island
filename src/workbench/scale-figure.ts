import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createCrew } from '../assets/crew'
import { studioCamera, studioScaleFigure } from '../assets/recipes/workbench-stage'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { createMeshFactory, type MeshFactory } from '../island-meshes'
import type { FieldSite } from './field-site'
import type { Entry, Values } from './subject'

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
// It is built the first time it is shown, so subjects that never ask for it pay nothing, and it has
// its own mesh factory, so wireframe on the subject's shared materials never reaches the figure.
function createScaleFigure(meshes: MeshFactory, footprint: Footprint) {
  let root: TransformNode | undefined
  let figure: ScaleFigure | undefined
  let { min, extent } = footprint
  function stand() {
    if (!root) return
    const { ground, alpha } = footprint
    const side = [Math.sin(alpha), -Math.cos(alpha)]
    const reach = (Math.abs(side[0]) * extent.x + Math.abs(side[1]) * extent.z) / halves + studioScaleFigure.clearance
    root.position.set(min.x + extent.x / halves + side[0] * reach, ground, min.z + extent.z / halves + side[1] * reach)
    // In profile, facing the subject: a clean height reference that reads as someone inspecting it.
    root.rotation.y = -alpha
    const bounds = root.getHierarchyBoundingVectors(true)
    figure = { height: bounds.max.y - bounds.min.y, ...bounds }
  }
  return {
    show(visible: boolean) {
      if (!visible && !root) return
      if (!root) {
        root = createCrew(createMeshFactory(meshes.scene, meshes.shadows), 0).root
        stand()
      }
      root.setEnabled(visible)
      return visible ? figure : undefined
    },
    // Moves the figure when the shown subject changes size without a rebuild.
    place(next: Bounds) {
      min = next.min
      extent = next.max.subtract(next.min)
      stand()
    },
  }
}

interface Bounds { min: Vector3, max: Vector3 }

// The bounds of the subject meshes that are shown and enabled; hidden parts, such as cargo not yet loaded, stay out.
export function measureShown(subject: readonly AbstractMesh[]): Bounds | undefined {
  let min = new Vector3(Infinity, Infinity, Infinity)
  let max = new Vector3(-Infinity, -Infinity, -Infinity)
  for (const mesh of subject) {
    if (!mesh.isVisible || !mesh.isEnabled()) continue
    mesh.computeWorldMatrix(true)
    const { boundingBox } = mesh.getBoundingInfo()
    min = Vector3.Minimize(min, boundingBox.minimumWorld)
    max = Vector3.Maximize(max, boundingBox.maximumWorld)
  }
  return min.x <= max.x ? { min, max } : undefined
}

// Live controls such as a growth slider rescale the subject without a rebuild, and playback can move
// parts of it, such as a crate in a cargo trial. The bounds are measured again whenever the settings
// change (including the first frame) and whenever playback rests on a new pose, paused or scrubbed,
// and the figure follows them. While playback runs they hold still, so the figure never shuffles,
// and the footer marks the bounds as a playback snapshot.
export function trackSubjectSize(subject: readonly AbstractMesh[], start: Bounds, figure?: ReturnType<typeof createScaleFigure>) {
  let bounds = start
  let measuredFor = ''
  let held = false
  return {
    bounds: () => bounds,
    // Width (x), depth (z) and height, in metres.
    dimensions() {
      const extent = bounds.max.subtract(bounds.min)
      return [extent.x, extent.z, extent.y] as const
    },
    // True while playback runs, so the bounds are a snapshot rather than the live pose.
    held: () => held,
    // `pose` is the clock time while playback is paused, and undefined while it runs.
    // Returns whether the footer needs rewriting.
    refresh(settings: Values, pose?: number) {
      const holding = pose === undefined
      const heldChanged = holding !== held
      held = holding
      const key = JSON.stringify(settings) + (holding ? '' : `@${pose}`)
      if (key === measuredFor) return heldChanged
      measuredFor = key
      const next = measureShown(subject)
      if (!next || (next.min.equals(bounds.min) && next.max.equals(bounds.max))) return heldChanged
      bounds = next
      figure?.place(bounds)
      return true
    },
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
  boundsHeld?: boolean
  setScaleFigure?: (visible: boolean) => ScaleFigure | undefined
}

// Shows the crew figure and writes the footer's bounds.
// Views where the figure cannot help (landscapes, on-island sites, fixed-focus studies, the crew itself) hide the toggle.
export function showScaleTools(stage: ScaleStage | undefined, visible: boolean) {
  document.getElementById('scale-figure-option')!.hidden = !stage?.setScaleFigure
  writeBounds(stage?.dimensions, stage?.setScaleFigure?.(visible)?.height, stage?.boundsHeld)
}

// The footer's bounds, with a spoken version for screen readers.
export function writeBounds(dimensions?: readonly [number, number, number], crew?: number, held = false) {
  const size = document.getElementById('subject-size')!
  size.replaceChildren()
  if (!dimensions) return
  const [width, depth, height] = dimensions.map(metres)
  const when = held ? ', playback snapshot' : ''
  const shown = document.createElement('span')
  shown.ariaHidden = 'true'
  shown.textContent = `bounds ${width} × ${depth} × ${height} m (w × d × h${when})${crew ? ` · crew ${metres(crew)} m` : ''}`
  const spoken = document.createElement('span')
  spoken.className = 'sr-only'
  spoken.textContent = `Bounds of everything shown${held ? ', as a snapshot taken during playback' : ''}: width ${width} m, depth ${depth} m, height ${height} m.${crew ? ` Crew member ${metres(crew)} m tall.` : ''}`
  size.append(shown, spoken)
}
