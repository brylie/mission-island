import { roadKinds } from '../assets/geometry/route-profiles'
import { roadDesignerLook as look } from '../assets/recipes/workbench-roads'
import { bendToward, stretchMiddle } from '../road-shape'
import { previewRoadLayouts } from '../terrain'
import type { Point } from '../world'
import { starterRoads } from '../worlds/starter/layout/roads'
import { roadSavePath, workbenchSaveHeader } from '../workbench-save-contract'
import { downloadJsonFile } from './file-download'
import { createLandscapeMapCanvas } from './landscape-map-canvas'
import { fullMapView, panMap, pointInWorld, roundedPoint, viewPointOnMap, zoomMap, type MapView } from './landscape-map-projection'
import { analyseRoad, type RoadAnalysis } from './road-analysis'
import { createRoadDraft, type RoadDraftRoad } from './road-draft'
import { alongAt, paintLongSection, paintRoads, screenPoint } from './road-paint'
import { roadDesignerMarkup } from './road-designer-markup'
import { suggestRoute } from './road-suggest'

// The Workbench road designer: lay out roads on the island map. Click to add dots,
// drag a dot to move it, drag the small handle in the middle of a stretch to bend
// it, double-click a stretch to add a dot there. Each road finds its height through
// the natural ground within its grade limit; the map colours it by grade, the long
// section shows ground and road along it, and warnings name where it needs work.
// Save writes the layout into the source tree for the game to read.

const hash = '#road-designer'
const zoomStep = 1.25
const percent = 100
const jsonIndent = 2

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
  root.innerHTML = roadDesignerMarkup(Object.keys(roadKinds))
  const host = document.getElementById('landscape-map')?.parentElement ?? document.body
  // A reloaded module (during development) replaces the panel rather than stacking another.
  for (const stale of document.querySelectorAll('.road-designer')) stale.remove()
  host.append(root)
  const base = element<HTMLCanvasElement>(root, '.road-map-base'), overlay = element<HTMLCanvasElement>(root, '.road-map-overlay')
  const chart = element<HTMLCanvasElement>(root, '.road-section')
  chart.width = look.chart.width
  chart.height = look.chart.height
  return { root, base, overlay, chart, map: createLandscapeMapCanvas(base, overlay), status: element<HTMLElement>(root, '.road-status') }
}

const analyses = new Map<string, { key: string, analysis: RoadAnalysis }>()
function analysis(road: RoadDraftRoad) {
  const key = JSON.stringify(road)
  const cached = analyses.get(road.id)
  if (cached?.key === key) return cached.analysis
  const fresh = analyseRoad(road)
  analyses.set(road.id, { key, analysis: fresh })
  return fresh
}

let view: MapView = fullMapView
let hoverAlong: number | undefined
let pendingStart: Point | undefined
let drawing = false

function say(text: string) {
  if (panel) panel.status.textContent = text
}

function render() {
  if (!panel || panel.root.hidden) return
  const roads = draft.roads().map((road) => ({ road, analysis: analysis(road) }))
  panel.map.paintView(view)
  const ink = panel.overlay.getContext('2d')
  if (ink) paintRoads(ink, view, roads, { road: draft.road()?.id, dot: draft.selectedDot(), hoverAlong })
  const selected = draft.road()
  const chartInk = panel.chart.getContext('2d')
  const current = selected && analysis(selected)
  if (chartInk) paintLongSection(chartInk, current, hoverAlong)
  renderInspector(panel.root, selected, current)
}

function renderInspector(root: HTMLElement, road: RoadDraftRoad | undefined, current: RoadAnalysis | undefined) {
  const select = element<HTMLSelectElement>(root, '.road-select')
  select.replaceChildren(...draft.roads().map((entry) => new Option(entry.name, entry.id, false, entry.id === road?.id)))
  for (const field of root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('[data-needs-road]')) field.disabled = !road
  const name = element<HTMLInputElement>(root, '.road-name')
  if (document.activeElement !== name) name.value = road?.name ?? ''
  element<HTMLSelectElement>(root, '.road-kind').value = road?.kind ?? 'fire-road'
  const dot = draft.selectedDot()
  const stretch = road && dot !== undefined ? Math.min(dot, road.bends.length - 1) : undefined
  const grade = element<HTMLInputElement>(root, '.road-grade')
  grade.disabled = stretch === undefined
  if (document.activeElement !== grade) grade.value = stretch === undefined ? '' : String(Math.round((road?.maxGrade?.[stretch] ?? roadKinds[road!.kind].maxGrade) * percent))
  element<HTMLButtonElement>(root, '.road-suggest').disabled = !road || dot === undefined || dot >= road.points.length - 1
  element<HTMLButtonElement>(root, '.road-delete-dot').disabled = dot === undefined
  const length = current?.graded.profile.at(-1)?.along ?? 0
  element<HTMLElement>(root, '.road-summary').textContent = road ? `${road.points.length} dots · ${Math.round(length)} m · ${current?.warnings.length ? `${current.warnings.length} to fix` : 'no problems'}` : 'No road selected. Choose New road, then click two points on the map.'
  element<HTMLElement>(root, '.road-warnings').replaceChildren(...(current?.warnings ?? []).map((warning) => {
    const item = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = warning.text
    button.addEventListener('click', () => {
      hoverAlong = warning.along
      render()
    })
    item.append(button)
    return item
  }))
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
    if (!done || done.moved || done.kind !== 'pan') return
    click(mapPoint(canvas, event))
  })
  canvas.addEventListener('dblclick', (event) => {
    const road = draft.road()
    const current = road && analysis(road)
    if (!road || !current) return
    const point = mapPoint(canvas, event)
    const nearest = current.graded.profile.reduce((best, sample) => Math.hypot(sample.x - point.x, sample.z - point.z) < Math.hypot(best.x - point.x, best.z - point.z) ? sample : best)
    draft.insertDot(nearest.stretch, roundedPoint(nearest))
    render()
  })
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    const box = canvas.getBoundingClientRect()
    view = zoomMap(view, view.zoom * (event.deltaY < 0 ? zoomStep : 1 / zoomStep), { u: (event.clientX - box.left) / box.width, v: (event.clientY - box.top) / box.height })
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
  else if (draft.road()) draft.extend(point)
  render()
}

function bindControls(root: HTMLElement) {
  const on = (selector: string, event: string, handler: (target: HTMLInputElement) => void) =>
    element(root, selector).addEventListener(event, (e) => {
      handler(e.target as HTMLInputElement)
      render()
    })
  on('.road-select', 'change', (target) => draft.select(target.value))
  on('.road-new', 'click', () => {
    drawing = true
    pendingStart = undefined
    say('Click where the new road starts.')
  })
  on('.road-name', 'change', (target) => draft.setRoad({ name: target.value.trim() || 'Road' }))
  on('.road-kind', 'change', (target) => draft.setRoad({ kind: target.value as RoadDraftRoad['kind'] }))
  on('.road-grade', 'change', (target) => {
    const road = draft.road(), dot = draft.selectedDot()
    if (!road || dot === undefined) return
    const value = Number(target.value)
    draft.setStretchGrade(Math.min(dot, road.bends.length - 1), target.value && value > 0 ? value / percent : null)
  })
  on('.road-suggest', 'click', () => suggest())
  on('.road-delete-dot', 'click', () => draft.deleteDot())
  on('.road-delete', 'click', () => draft.deleteRoad())
  on('.road-undo', 'click', () => draft.undo())
  on('.road-redo', 'click', () => draft.redo())
  on('.road-discard', 'click', () => {
    draft.discard()
    say('Back to the roads in the source tree.')
  })
  on('.road-download', 'click', () => downloadJsonFile('mission-island-roads.json', JSON.stringify(draft.roads(), null, jsonIndent)))
  on('.road-save', 'click', () => void save())
  const chart = element<HTMLCanvasElement>(root, '.road-section')
  chart.addEventListener('pointermove', (event) => {
    const road = draft.road()
    hoverAlong = road && alongAt(chart, analysis(road), event.offsetX)
    render()
  })
  root.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      if (event.shiftKey) draft.redo()
      else draft.undo()
    }
    else if (event.key === 'Delete' || event.key === 'Backspace') draft.deleteDot()
    else if (event.key === 'Escape') drawing = false
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

async function save() {
  say('Saving…')
  try {
    const response = await fetch(roadSavePath, { method: 'POST', headers: { 'content-type': 'application/json', [workbenchSaveHeader]: 'save' }, body: JSON.stringify(draft.roads()) })
    say(response.ok
      ? 'Saved to src/worlds/starter/layout/roads.ts. Run npm run island:generate to re-plant Highwood around it.'
      : `Not saved: ${await response.text()}`)
  }
  catch {
    say('Not saved: the dev server is not running. Use Download instead.')
  }
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
  render()
}
