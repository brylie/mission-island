import { gradedRoadKinds, roadKinds } from '../assets/geometry/road-kinds'
import { roadDesignerLook as look } from '../assets/recipes/workbench-roads'
import { bendToward, stretchMiddle } from '../road-shape'
import { createRoadGrading } from '../road-grading'
import { naturalGroundHeight, previewRoadLayouts } from '../terrain'
import type { Point } from '../world'
import { starterRoads } from '../worlds/starter/layout/roads'
import { downloadJsonFile } from './file-download'
import { createLandscapeMapCanvas } from './landscape-map-canvas'
import { fullMapView, panMap, pointInWorld, pointOnMap, roundedPoint, viewPointOnMap, zoomMap, type MapView } from './landscape-map-projection'
import { analyseRoad, type RoadAnalysis, type RoadWarning } from './road-analysis'
import { createRoadDraft, type RoadDraftRoad } from './road-draft'
import { alongAt, paintLongSection, paintRoads, screenPoint } from './road-paint'
import { roadDesignerMarkup } from './road-designer-markup'
import { cancelOverwrite, sayPendingNotice, saveRoads } from './road-save'
import { keepFocus, renderInspector, setText } from './road-inspector'
import { suggestRoute } from './road-suggest'

// The Workbench road designer: lay out roads on the island map. Click to add dots,
// drag a dot to move it, drag the small handle in the middle of a stretch to bend
// it, double-click a stretch to add a dot there. Each road finds its height through
// the natural ground within its grade limit; the map colours it by grade, the long
// section shows ground and road along it, and warnings name where it needs work.
// Save writes the layout into the source tree for the game to read.
//
// Everything a pointer does has a keyboard path too: the Dot list picks a dot, so
// Suggest route, Delete dot and Stretch limit work without the map, and with the
// map focused the arrow keys pan and + and − zoom. Each action says what it did in
// the status line, which sits with Save in a footer that stays in view.

const hash = '#road-designer'
const percent = 100
const jsonIndent = 2
const downloadName = 'mission-island-roads.json'
const mapMiddle = 0.5
const viewCenter = { u: mapMiddle, v: mapMiddle }
const panKeys: Readonly<Record<string, { u: number, v: number }>> = {
  ArrowLeft: { u: 1, v: 0 },
  ArrowRight: { u: -1, v: 0 },
  ArrowUp: { u: 0, v: 1 },
  ArrowDown: { u: 0, v: -1 },
}
// Matched by key, and by physical key so + works without Shift on any layout.
const zoomInKeys = new Set(['+', '=', 'Equal', 'NumpadAdd']), zoomOutKeys = new Set(['-', '_', 'Minus', 'NumpadSubtract'])
const zoomKey = (event: KeyboardEvent) => zoomInKeys.has(event.key) || zoomInKeys.has(event.code) ? look.zoomStep : zoomOutKeys.has(event.key) || zoomOutKeys.has(event.code) ? 1 / look.zoomStep : undefined

type Drag = { kind: 'dot' | 'middle' | 'pan', index: number, startX: number, startY: number, moved: boolean }

const draft = createRoadDraft()
// The roads the island should be graded with while the designer is open.
export const designerRoads = () => draft.roads()

let panel: ReturnType<typeof buildPanel> | undefined

function element<T extends HTMLElement>(root: HTMLElement, selector: string) {
  return root.querySelector<T>(selector)!
}

function buildPanel() {
  const root = document.createElement('aside')
  root.className = 'road-designer'
  root.setAttribute('aria-labelledby', 'road-designer-title')
  root.innerHTML = roadDesignerMarkup(gradedRoadKinds)
  const host = document.getElementById('landscape-map')?.parentElement ?? document.body
  // A reloaded module (during development) replaces the panel rather than stacking another.
  for (const stale of document.querySelectorAll('.road-designer')) stale.remove()
  host.append(root)
  // Hiding the panel leaves its header, so the 3D preview behind it can be seen.
  const collapse = element<HTMLButtonElement>(root, '.road-collapse')
  collapse.addEventListener('click', () => {
    const open = root.classList.toggle('road-collapsed') === false
    collapse.setAttribute('aria-expanded', String(open))
    collapse.textContent = open ? 'Hide' : 'Show'
  })
  const base = element<HTMLCanvasElement>(root, '.road-map-base'), overlay = element<HTMLCanvasElement>(root, '.road-map-overlay')
  const chart = element<HTMLCanvasElement>(root, '.road-section')
  chart.width = look.chart.width
  chart.height = look.chart.height
  return { root, base, overlay, chart, map: createLandscapeMapCanvas(base, overlay), status: element<HTMLElement>(root, '.road-status') }
}

// Roads are analysed as the island grades the whole draft, so a branch is judged where it
// really meets its road. Editing a road regrades the draft's profiles, not its height raster.
let graded: { key: string, grading: ReturnType<typeof createRoadGrading> } | undefined
const analyses = new Map<string, { key: string, analysis: RoadAnalysis }>()
function analysis(road: RoadDraftRoad) {
  const key = JSON.stringify(draft.roads())
  if (graded?.key !== key) graded = { key, grading: createRoadGrading(draft.roads(), naturalGroundHeight) }
  const cached = analyses.get(road.id)
  if (cached?.key === key) return cached.analysis
  const found = graded.grading.roads().find((other) => other.id === road.id)
  if (!found) return undefined
  const fresh = analyseRoad(found)
  analyses.set(road.id, { key, analysis: fresh })
  return fresh
}

let view: MapView = fullMapView
let hoverAlong: number | undefined
// The warning last activated, so its button can say it is the one marked.
let markedWarning: string | undefined
let pendingStart: Point | undefined
let drawing = false
let dragging = false

function say(text: string) {
  if (panel) setText(panel.status, text)
}

function markWarning(warning: RoadWarning) {
  hoverAlong = warning.along
  markedWarning = warning.text
  say(`Marked on the map and long section: ${warning.text}.`)
  render()
}

function render() {
  if (!panel || panel.root.hidden) return
  const roads = draft.roads().flatMap((road) => {
    const found = analysis(road)
    return found ? [{ road, analysis: found }] : []
  })
  panel.map.paintView(view)
  const ink = panel.overlay.getContext('2d')
  if (ink) paintRoads(ink, view, roads, { road: draft.road()?.id, dot: draft.selectedDot(), hoverAlong })
  const road = draft.road()
  const chartInk = panel.chart.getContext('2d')
  const current = road && analysis(road)
  if (chartInk) paintLongSection(chartInk, current, hoverAlong)
  renderInspector(panel.root, {
    roads: draft.roads(),
    road,
    analysis: current,
    dot: draft.selectedDot(),
    hoverAlong,
    markedWarning,
    canUndo: draft.canUndo(),
    canRedo: draft.canRedo(),
    dragging,
    onWarning: markWarning,
  })
}

function mapPoint(canvas: HTMLCanvasElement, event: PointerEvent | MouseEvent) {
  const box = canvas.getBoundingClientRect()
  const point = viewPointOnMap({ u: (event.clientX - box.left) / box.width, v: (event.clientY - box.top) / box.height }, view)
  return roundedPoint(pointInWorld(point.u, point.v))
}

// The dot or stretch handle of the selected road under the pointer, if any.
function picked(canvas: HTMLCanvasElement, event: PointerEvent): Pick<Drag, 'kind' | 'index'> | undefined {
  const road = draft.road()
  if (!road) return undefined
  const box = canvas.getBoundingClientRect()
  const scale = canvas.width / box.width
  const at = { x: (event.clientX - box.left) * scale, z: (event.clientY - box.top) * scale }
  // The pick radius is in screen pixels, however large the canvas is drawn.
  const near = (point: Point) => Math.hypot(point.x - at.x, point.z - at.z) <= look.pickRadius * scale
  const dot = road.points.findIndex((point) => near(screenPoint(point, view, canvas)))
  if (dot >= 0) return { kind: 'dot', index: dot }
  const middle = road.bends.findIndex((_, i) => near(screenPoint(stretchMiddle(road, i), view, canvas)))
  return middle >= 0 ? { kind: 'middle', index: middle } : undefined
}

function bindMap(canvas: HTMLCanvasElement) {
  let drag: Drag | undefined
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId)
    const hit = picked(canvas, event)
    drag = { kind: hit?.kind ?? 'pan', index: hit?.index ?? -1, startX: event.clientX, startY: event.clientY, moved: false }
    if (hit?.kind === 'dot') draft.select(draft.road()?.id, hit.index)
    render()
  })
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < look.dragThreshold) return
    if (!drag.moved && drag.kind !== 'pan') draft.begin()
    drag.moved = true
    dragging = drag.kind !== 'pan'
    const road = draft.road()
    if (drag.kind === 'dot') draft.moveDot(drag.index, mapPoint(canvas, event))
    else if (drag.kind === 'middle' && road) draft.setBend(drag.index, Number(bendToward(road, drag.index, mapPoint(canvas, event)).toFixed(1)))
    else {
      const box = canvas.getBoundingClientRect()
      view = panMap(view, { u: event.movementX / box.width, v: event.movementY / box.height })
    }
    render()
  })
  canvas.addEventListener('pointerup', (event) => {
    const done = drag
    drag = undefined
    if (dragging) {
      dragging = false
      render()
    }
    if (!done || done.moved || done.kind !== 'pan') return
    click(mapPoint(canvas, event))
  })
  // A cancelled touch drag never sends pointerup; without this the summary would stay frozen.
  canvas.addEventListener('pointercancel', () => {
    drag = undefined
    dragging = false
    render()
  })
  canvas.addEventListener('dblclick', (event) => {
    const road = draft.road()
    const current = road && analysis(road)
    if (!road || !current) return
    const point = mapPoint(canvas, event)
    const nearest = current.graded.profile.reduce((best, sample) => Math.hypot(sample.x - point.x, sample.z - point.z) < Math.hypot(best.x - point.x, best.z - point.z) ? sample : best)
    draft.insertDot(nearest.stretch, roundedPoint(nearest))
    say(`Added dot ${(draft.selectedDot() ?? 0) + 1} at ${Math.round(nearest.along)} m.`)
    render()
  })
  canvas.addEventListener('keydown', (event) => {
    const pan = panKeys[event.key], zoom = zoomKey(event)
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (pan) view = panMap(view, { u: pan.u * look.keyPanShare, v: pan.v * look.keyPanShare })
    else if (zoom) view = zoomMap(view, view.zoom * zoom, viewCenter)
    else if (event.key === 'Delete' || event.key === 'Backspace') deleteDot()
    else return
    event.preventDefault()
    render()
  })
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    const box = canvas.getBoundingClientRect()
    view = zoomMap(view, view.zoom * (event.deltaY < 0 ? look.zoomStep : 1 / look.zoomStep), { u: (event.clientX - box.left) / box.width, v: (event.clientY - box.top) / box.height })
    render()
  }, { passive: false })
}

// A click on open ground: the next point of a new road, or a dot added to the selected road's nearer end.
function click(point: Point) {
  if (drawing) {
    if (!pendingStart) {
      pendingStart = point
      say('Now click where the road ends.')
      return
    }
    draft.addRoad(pendingStart, point, 'fire-road')
    pendingStart = undefined
    drawing = false
    say('Road added. Drag the middle handle of a stretch to bend it, or add dots with Suggest route.')
  }
  else if (draft.road()) {
    draft.extend(point)
    say(`Added dot ${(draft.selectedDot() ?? 0) + 1}. Ctrl+Z to undo.`)
  }
  render()
}

function deleteDot() {
  const road = draft.road(), dot = draft.selectedDot()
  if (!road || dot === undefined) {
    say('Pick a dot from the Dot list first.')
    return
  }
  draft.deleteDot()
  say(draft.roads().includes(road)
    ? `Deleted dot ${dot + 1}. Ctrl+Z to undo.`
    : `Deleted dot ${dot + 1}, and with it ${road.name}, since a road needs two dots. Ctrl+Z to undo.`)
}

// Undo or redo one step, and say so only if there was one.
function history(forward: boolean) {
  if (forward ? !draft.canRedo() : !draft.canUndo()) {
    say(forward ? 'Nothing to redo.' : 'Nothing to undo.')
    return
  }
  if (forward) draft.redo()
  else draft.undo()
  say(forward ? 'Redone.' : 'Undone.')
}

// Brings a dot picked from the Dot list into view when the map is zoomed in.
function showDot(point: Point) {
  const at = pointOnMap(point)
  view = panMap(view, { u: (view.u - (at.u - mapMiddle / view.zoom)) * view.zoom, v: (view.v - (at.v - mapMiddle / view.zoom)) * view.zoom })
}

// Sets the selected stretch's grade limit from the field, within the field's own range.
function setStretchLimit(text: string) {
  const road = draft.road(), dot = draft.selectedDot()
  if (!road || dot === undefined) return
  const stretch = Math.min(dot, road.bends.length - 1)
  const value = Number(text)
  if (!text.trim() || !Number.isFinite(value)) {
    draft.setStretchGrade(stretch, null)
    say(`Dot ${stretch + 1} to the next uses the ${road.kind.replace('-', ' ')} limit, ${Math.round(roadKinds[road.kind].maxGrade * percent)}%.`)
    return
  }
  const limit = Math.round(Math.min(look.stretchLimitPercent.max, Math.max(look.stretchLimitPercent.min, value)))
  draft.setStretchGrade(stretch, limit / percent)
  say(`Dot ${stretch + 1} to the next: limit set to ${limit}%.`)
}

function moveRoad(step: number) {
  draft.moveRoad(step)
  const road = draft.road(), roads = draft.roads()
  if (road) say(`${road.name} is now road ${roads.indexOf(road) + 1} of ${roads.length}. Roads are graded in list order.`)
}

function bindControls(root: HTMLElement) {
  const on = (selector: string, event: string, handler: (target: HTMLInputElement) => void) =>
    element(root, selector).addEventListener(event, (e) => {
      if (selector !== '.road-save') cancelOverwrite()
      handler(e.target as HTMLInputElement)
      render()
      if (panel) keepFocus(e.target, panel.overlay)
    })
  on('.road-select', 'change', (target) => draft.select(target.value))
  on('.road-dot', 'change', (target) => {
    const road = draft.road(), dot = target.value === '' ? undefined : Number(target.value)
    draft.select(road?.id, dot)
    hoverAlong = undefined
    if (road && dot !== undefined) showDot(road.points[dot])
  })
  on('.road-move-up', 'click', () => moveRoad(-1))
  on('.road-move-down', 'click', () => moveRoad(1))
  on('.road-new', 'click', () => {
    drawing = true
    pendingStart = undefined
    say('Click where the new road starts. Escape cancels.')
  })
  on('.road-name', 'change', (target) => draft.setRoad({ name: target.value.trim() || 'Road' }))
  on('.road-kind', 'change', (target) => draft.setRoad({ kind: target.value as RoadDraftRoad['kind'] }))
  on('.road-grade', 'change', (target) => setStretchLimit(target.value))
  on('.road-suggest', 'click', () => suggest())
  on('.road-delete-dot', 'click', () => deleteDot())
  on('.road-delete', 'click', () => {
    const road = draft.road()
    draft.deleteRoad()
    if (road) say(`Deleted ${road.name}. Ctrl+Z to undo.`)
  })
  on('.road-undo', 'click', () => history(false))
  on('.road-redo', 'click', () => history(true))
  on('.road-discard', 'click', () => {
    draft.discard()
    say('Back to the roads in roads.ts. Ctrl+Z brings the draft back.')
  })
  on('.road-download', 'click', () => {
    downloadJsonFile(downloadName, JSON.stringify(draft.roads(), null, jsonIndent))
    say(`Downloaded the layout as ${downloadName}.`)
  })
  on('.road-save', 'click', () => void saveRoads(draft, say))
  const chart = element<HTMLCanvasElement>(root, '.road-section')
  chart.addEventListener('pointermove', (event) => {
    const road = draft.road()
    hoverAlong = road && alongAt(chart, analysis(road), event.offsetX)
    markedWarning = undefined
    render()
  })
  root.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      history(event.shiftKey)
    }
    else if (event.key === 'Escape' && drawing) {
      drawing = false
      pendingStart = undefined
      say('New road cancelled.')
    }
    else return
    event.preventDefault()
    render()
  })
}

// Fills the stretch after the selected dot with a grade-limited route to the next dot.
function suggest() {
  const road = draft.road(), dot = draft.selectedDot()
  if (!road || dot === undefined || dot >= road.points.length - 1) return
  const limit = road.maxGrade?.[dot] ?? roadKinds[road.kind].maxGrade
  const route = suggestRoute(road.points[dot], road.points[dot + 1], limit)
  if (!route) {
    say(`No route within ${Math.round(limit * percent)}% between these dots. Raise the stretch's grade limit or move a dot.`)
    return
  }
  draft.replaceBetween(dot, dot + 1, route.dots.map(roundedPoint), route.bends)
  say(`Suggested ${route.dots.length} dots within ${Math.round(limit * percent)}%.`)
}

// Shows the designer while its study is open, and puts the game's roads back when it closes.
export function openRoadDesigner() {
  if (!panel) {
    panel = buildPanel()
    bindMap(panel.overlay)
    bindControls(panel.root)
    window.addEventListener('hashchange', () => {
      const open = location.hash.startsWith(hash)
      if (panel) panel.root.hidden = !open
      if (!open) previewRoadLayouts(starterRoads)
    })
  }
  panel.root.hidden = false
  sayPendingNotice(say)
  render()
}
