import { farm } from '../farm'
import { northernRegions } from '../scenery'
import { beach, forest, harbor, lookout, town } from '../world'
import type { Point } from '../world'
import type { DraftMapObject } from './landscape-layout'
import { bindMapGestures } from './landscape-map-gestures'
import { createLandscapeMapCanvas } from './landscape-map-canvas'
import {
  clampMapPoint,
  fullMapView,
  mapPointInView,
  maxMapZoom,
  onMap,
  panMap,
  pointInWorld,
  pointOnMap,
  shotCameraPoint,
  roundedPoint,
  viewPointOnMap,
  zoomMap,
} from './landscape-map-projection'
import type { MapPoint, MapView } from './landscape-map-projection'
import type { LandscapeShot } from './landscape-shot'

const landmarks: { name: string, point: Point, labelOnLeft?: boolean }[] = [
  ...northernRegions.map(({ id, name, at }) => ({ name, point: at, labelOnLeft: id === 'pool' })),
  { name: 'Pinewoods', point: forest, labelOnLeft: true },
  { name: 'Lookout', point: lookout },
  { name: 'Harbor', point: harbor },
  { name: 'Seabrook', point: town },
  { name: 'Farm', point: farm },
  { name: 'Beach', point: beach },
]

const directions: Readonly<Record<string, Point>> = {
  ArrowLeft: { x: -1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
  ArrowDown: { x: 0, z: -1 },
  ArrowUp: { x: 0, z: 1 },
}
const mapMidpoint = 0.5
const viewCenter = { u: mapMidpoint, v: mapMidpoint }
const percentScale = 100
const fineKeyboardStep = 0.1
const fastKeyboardPan = 10
const zoomInScale = 2
const zoomOutScale = 0.5

interface MapControls {
  focus(): Point | undefined
  placements(): readonly DraftMapObject[]
  shots(): readonly LandscapeShot[]
  jump(point: Point): void
  place(point: Point): boolean
  move(id: number, point: Point): boolean
  select(id: number): void
  openShot(shot: LandscapeShot): void
}

interface Pin {
  button: HTMLButtonElement
  point: MapPoint
}

function makePin(title: string, kind: 'landmark' | 'shot' | 'draft') {
  const pin = document.createElement('button')
  pin.type = 'button'
  pin.className = `map-pin map-pin--${kind}`
  pin.title = title
  pin.setAttribute('aria-label', kind === 'shot' ? `Open saved shot ${title}` : title)
  return pin
}

function placePin(button: HTMLButtonElement, { u, v }: MapPoint) {
  button.hidden = !onMap({ u, v })
  if (button.hidden) return
  button.style.left = `${u * percentScale}%`
  button.style.top = `${v * percentScale}%`
}

export function createLandscapeMap(controls: MapControls) {
  const panel = document.getElementById('landscape-map')!
  const toggle = document.querySelector<HTMLButtonElement>('#landscape-map-toggle')!
  const closeButton = document.querySelector<HTMLButtonElement>('#landscape-map-close')!
  const zoomIn = document.querySelector<HTMLButtonElement>('#landscape-map-zoom-in')!
  const zoomOut = document.querySelector<HTMLButtonElement>('#landscape-map-zoom-out')!
  const resetZoom = document.querySelector<HTMLButtonElement>('#landscape-map-reset')!
  const zoomLabel = document.getElementById('landscape-map-zoom')!
  const surface = document.getElementById('landscape-map-surface')!
  const canvas = document.querySelector<HTMLCanvasElement>('#landscape-map-canvas')!
  const overlay = document.querySelector<HTMLCanvasElement>('#landscape-map-overlay')!
  const landmarkPins = document.getElementById('landscape-map-landmarks')!
  const shotPins = document.getElementById('landscape-map-shot-pins')!
  const draftPins = document.getElementById('landscape-map-draft-pins')!
  const jumpMode = document.querySelector<HTMLInputElement>('#landscape-map-jump')!
  const placeMode = document.querySelector<HTMLInputElement>('#landscape-map-place')!
  const placementRow = document.getElementById('landscape-map-placement-row')!
  const placementKind = document.querySelector<HTMLSelectElement>('#landscape-map-kind')!
  const layoutKind = document.querySelector<HTMLSelectElement>('#landscape-kind')!
  const shotRow = document.getElementById('landscape-map-shot-row')!
  const shotSelect = document.querySelector<HTMLSelectElement>('#landscape-map-shots')!
  const status = document.getElementById('landscape-map-status')!
  const abort = new AbortController()
  const events = { signal: abort.signal }
  const art = createLandscapeMapCanvas(canvas, overlay)
  const draftButtons = new Map<number, { button: HTMLButtonElement, object: DraftMapObject }>()
  let ready = false
  let view = fullMapView
  let paintedView: MapView | undefined
  let cursor = pointInWorld(viewCenter.u, viewCenter.v)
  let listedShots: readonly LandscapeShot[] | undefined
  let savedPins: Pin[] = []

  const project = (point: Point) => mapPointInView(pointOnMap(point), view)
  const coordinates = ({ x, z }: Point) => `X ${x.toFixed(1)} m · Z ${z.toFixed(1)} m`
  placementKind.replaceChildren(...Array.from(layoutKind.options, ({ text, value }) => new Option(text, value)))

  function activate(position: Point, placeName?: string) {
    if (!ready) return
    const point = roundedPoint(position)
    cursor = point
    const destination = placeName ?? coordinates(point)
    if (placeMode.checked) {
      if (!controls.place(point)) {
        status.textContent = 'The draft is full. Remove an object to make room.'
        return
      }
      status.textContent = `Placed ${placementKind.selectedOptions[0].text} at ${destination}.`
    }
    else status.textContent = `Focused on ${destination}.`
    controls.jump(point)
    update()
  }

  const fixedPins = landmarks.map(({ name, point, labelOnLeft }) => {
    const button = makePin(name, 'landmark')
    if (labelOnLeft) button.classList.add('map-pin--label-left')
    const label = document.createElement('span')
    label.textContent = name
    button.append(label)
    button.addEventListener('click', () => activate(point, name), events)
    return { button, point: pointOnMap(point) }
  })
  landmarkPins.replaceChildren(...fixedPins.map(({ button }) => button))

  function openShot(shot: LandscapeShot) {
    if (!ready) return
    controls.openShot(shot)
    status.textContent = `Opened ${shot.name}.`
  }

  function refreshShots() {
    const shots = controls.shots()
    if (listedShots === shots) return
    listedShots = shots
    shotRow.hidden = shots.length === 0
    shotSelect.replaceChildren(new Option('Open a shot…', ''))
    savedPins = []
    for (const [index, shot] of shots.entries()) {
      shotSelect.add(new Option(shot.name, String(index)))
      const point = pointOnMap(shotCameraPoint(shot.camera))
      if (!onMap(point)) continue
      const button = makePin(shot.name, 'shot')
      button.addEventListener('click', () => openShot(shot))
      savedPins.push({ point, button })
    }
    shotPins.replaceChildren(...savedPins.map(({ button }) => button))
    positionPins(savedPins)
  }

  function positionPins(pins: Pin[]) {
    for (const { button, point } of pins) placePin(button, mapPointInView(point, view))
  }

  function moveDraft(object: DraftMapObject, point: Point) {
    if (!controls.move(object.id, point)) return
    status.textContent = `Moved ${object.name} to ${coordinates(point)}.`
  }

  function addDraftPin(object: DraftMapObject) {
    const button = makePin(object.name, 'draft')
    button.dataset.draftId = String(object.id)
    button.draggable = false
    button.setAttribute('aria-describedby', 'landscape-map-draft-help')
    button.addEventListener('click', (event) => {
      if (event.detail === 0) controls.select(object.id)
    })
    button.addEventListener('keydown', (event) => {
      const direction = directions[event.key]
      const current = draftButtons.get(object.id)?.object
      if (!direction || !current) return
      event.preventDefault()
      const step = event.shiftKey ? 1 : fineKeyboardStep
      const { u, v } = clampMapPoint(pointOnMap({ x: current.x + direction.x * step, z: current.z + direction.z * step }))
      const point = roundedPoint(pointInWorld(u, v))
      moveDraft(current, point)
      revealOnMap(point)
      update()
    })
    draftPins.append(button)
    return button
  }

  let lastDrafts = ''
  function refreshDrafts(viewChanged: boolean) {
    const objects = controls.placements()
    if (gestures.cancelIfDraftChanged(objects)) return
    const drag = gestures.drag
    const draftKey = JSON.stringify([objects, drag?.object.id, drag?.destination])
    if (!viewChanged && lastDrafts === draftKey) return
    lastDrafts = draftKey

    const ids = new Set(objects.map(({ id }) => id))
    for (const [id, { button }] of draftButtons) {
      if (ids.has(id)) continue
      if (document.activeElement === button) canvas.focus({ preventScroll: true })
      button.remove()
      draftButtons.delete(id)
    }
    for (const object of objects) {
      const pin = draftButtons.get(object.id) ?? { button: addDraftPin(object), object }
      if (pin.object.name !== object.name) {
        pin.button.title = object.name
        pin.button.setAttribute('aria-label', object.name)
      }
      pin.object = object
      draftButtons.set(object.id, pin)
      const destination = drag?.object.id === object.id ? drag.destination : undefined
      pin.button.classList.toggle('is-dragging', Boolean(destination))
      placePin(pin.button, project(destination ?? object))
    }
  }

  function paintView() {
    if (!art.paintView(view)) return
    zoomLabel.textContent = `${Number(view.zoom.toFixed(1))}×`
    zoomOut.disabled = resetZoom.disabled = view.zoom === 1
    zoomIn.disabled = view.zoom === maxMapZoom
    positionPins(fixedPins)
    positionPins(savedPins)
  }

  function update() {
    if (panel.hidden || !art.hasOverlay) return
    refreshShots()
    const viewChanged = paintedView !== view
    if (viewChanged) {
      paintView()
      paintedView = view
    }
    refreshDrafts(viewChanged)
    const focus = controls.focus()
    const cursorVisible = document.activeElement === canvas && !gestures.moved
    art.track(view, viewChanged, focus, cursor, cursorVisible)
  }

  function setView(next: MapView) {
    if (next.u === view.u && next.v === view.v && next.zoom === view.zoom) return
    view = next
    keepCursorVisible()
    update()
  }

  function changeZoom(factor: number, anchor = project(cursor)) {
    if (gestures.active) return
    setView(zoomMap(view, view.zoom * factor, onMap(anchor) ? anchor : viewCenter))
  }

  function revealOnMap(point: Point) {
    const position = project(point)
    if (!onMap(position)) setView(panMap(view, { u: viewCenter.u - position.u, v: viewCenter.v - position.v }))
  }

  function keepCursorVisible() {
    if (onMap(project(cursor))) return
    const { u, v } = viewPointOnMap(viewCenter, view)
    cursor = pointInWorld(u, v)
  }

  function show(open: boolean) {
    panel.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    if (!open) {
      gestures.cancel()
      return
    }
    const focus = controls.focus()
    if (focus && onMap(project(focus))) cursor = focus
    else keepCursorVisible()
    placementKind.value = layoutKind.value
    canvas.focus({ preventScroll: true })
    update()
  }

  function close() {
    show(false)
    toggle.focus()
  }

  const gestures = bindMapGestures(surface, canvas, events, {
    ready: () => ready,
    view: () => view,
    getDraft: (id) => draftButtons.get(id)?.object,
    setView,
    changeZoom,
    preview: update,
    selectDraft: (id) => controls.select(id),
    moveDraft,
    activate,
  })
  zoomIn.addEventListener('click', () => changeZoom(zoomInScale), events)
  zoomOut.addEventListener('click', () => changeZoom(zoomOutScale), events)
  resetZoom.addEventListener('click', () => setView(fullMapView), events)

  toggle.addEventListener('click', () => {
    if (panel.hidden) show(true)
    else close()
  }, events)
  closeButton.addEventListener('click', close, events)
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    if (gestures.active) gestures.cancel()
    else close()
  }, events)
  for (const mode of [jumpMode, placeMode]) {
    mode.addEventListener('change', () => {
      placementRow.hidden = !placeMode.checked
      canvas.classList.toggle('is-placing', placeMode.checked)
    }, events)
  }
  placementKind.addEventListener('change', () => {
    layoutKind.value = placementKind.value
  }, events)
  layoutKind.addEventListener('change', () => {
    placementKind.value = layoutKind.value
  }, events)
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.repeat) {
      event.preventDefault()
      activate(cursor)
      return
    }
    if (!event.ctrlKey && !event.metaKey && ['+', '=', '-'].includes(event.key)) {
      event.preventDefault()
      changeZoom(event.key === '-' ? zoomOutScale : zoomInScale)
      return
    }
    const direction = directions[event.key]
    if (!direction) return
    event.preventDefault()
    const step = event.shiftKey ? fastKeyboardPan : 1
    const { u, v } = clampMapPoint(pointOnMap({ x: cursor.x + direction.x * step, z: cursor.z + direction.z * step }))
    cursor = pointInWorld(u, v)
    revealOnMap(cursor)
    status.textContent = coordinates(cursor)
  }, events)
  shotSelect.addEventListener('change', () => {
    if (shotSelect.value && listedShots) openShot(listedShots[Number(shotSelect.value)])
    shotSelect.value = ''
  }, events)

  return {
    update,
    setScene(landscape: boolean, sceneReady: boolean) {
      ready = landscape && sceneReady && art.ready
      toggle.hidden = !landscape
      toggle.disabled = !ready
      if (!ready) show(false)
    },
    dispose() { abort.abort() },
  }
}
