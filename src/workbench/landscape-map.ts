import { farm } from '../farm'
import { northernRegions } from '../scenery'
import { beach, forest, harbor, lookout, town } from '../world'
import type { Point } from '../world'
import type { DraftMapObject } from './landscape-layout'
import { paintLandscapeMap, paintMapGuides } from './landscape-map-art'
import {
  clampMapPoint,
  fullMapView,
  landscapeMapSize,
  mapPointInView,
  maxMapZoom,
  panMap,
  pointInWorld,
  pointOnMap,
  shotCameraPoint,
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
const viewCenter = { u: 0.5, v: 0.5 }

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

interface PointerGesture {
  id: number
  x: number
  y: number
  view: MapView
  draft?: DraftMapObject
  moved: boolean
  destination?: Point
}

interface Pin {
  button: HTMLButtonElement
  point: MapPoint
}

function onMap({ u, v }: MapPoint) {
  return u >= 0 && u <= 1 && v >= 0 && v <= 1
}

function roundedPoint({ x, z }: Point): Point {
  return { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 }
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
  button.style.left = `${u * 100}%`
  button.style.top = `${v * 100}%`
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
  canvas.width = overlay.width = 640
  canvas.height = overlay.height = Math.round(canvas.width * landscapeMapSize.height / landscapeMapSize.width)
  const base = canvas.getContext('2d')
  const ink = overlay.getContext('2d')
  const draftButtons = new Map<number, { button: HTMLButtonElement, object: DraftMapObject }>()
  let ready = false
  let atlas: HTMLCanvasElement | undefined
  let view = fullMapView
  let paintedView: MapView | undefined
  let cursor = pointInWorld(0.5, 0.5)
  let lastOverlay = ''
  let listedShots: readonly LandscapeShot[] | undefined
  let savedPins: Pin[] = []
  let gesture: PointerGesture | undefined

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
      const step = event.shiftKey ? 1 : 0.1
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
    const dragged = gesture?.draft
    if (dragged && !objects.some(({ id, x, z }) => id === dragged.id && x === dragged.x && z === dragged.z)) {
      cancelGesture()
      return
    }
    const draftKey = JSON.stringify([objects, gesture?.draft?.id, gesture?.destination])
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
      const destination = gesture?.draft?.id === object.id ? gesture.destination : undefined
      pin.button.classList.toggle('is-dragging', Boolean(destination))
      placePin(pin.button, project(destination ?? object))
    }
  }

  function paintView() {
    if (!base) return
    if (!atlas) {
      atlas = document.createElement('canvas')
      atlas.width = canvas.width * 2
      atlas.height = canvas.height * 2
      const art = atlas.getContext('2d')
      if (art) paintLandscapeMap(art)
    }
    base.drawImage(atlas, atlas.width * view.u, atlas.height * view.v, atlas.width / view.zoom, atlas.height / view.zoom, 0, 0, canvas.width, canvas.height)
    zoomLabel.textContent = `${Number(view.zoom.toFixed(1))}×`
    zoomOut.disabled = resetZoom.disabled = view.zoom === 1
    zoomIn.disabled = view.zoom === maxMapZoom
    positionPins(fixedPins)
    positionPins(savedPins)
  }

  function paintTracking(context: CanvasRenderingContext2D, focus: Point | undefined, cursorVisible: boolean) {
    const { width, height } = overlay
    context.clearRect(0, 0, width, height)
    paintMapGuides(context, view.zoom)
    if (focus) {
      const { u, v } = project(focus)
      context.beginPath()
      context.arc(u * width, v * height, 12, 0, Math.PI * 2)
      context.lineWidth = 6
      context.strokeStyle = '#203d3c'
      context.stroke()
      context.lineWidth = 3
      context.strokeStyle = '#f5fff1'
      context.stroke()
    }
    if (cursorVisible) {
      const { u, v } = project(cursor)
      const x = u * width
      const y = v * height
      context.beginPath()
      context.moveTo(x - 10, y)
      context.lineTo(x + 10, y)
      context.moveTo(x, y - 10)
      context.lineTo(x, y + 10)
      context.lineWidth = 2
      context.strokeStyle = '#ffdf91'
      context.stroke()
    }
  }

  function update() {
    if (panel.hidden || !ink) return
    refreshShots()
    const viewChanged = paintedView !== view
    if (viewChanged) {
      paintView()
      paintedView = view
    }
    refreshDrafts(viewChanged)
    const focus = controls.focus()
    const cursorVisible = document.activeElement === canvas && !gesture?.moved
    const overlayKey = [focus?.x, focus?.z, cursorVisible, cursor.x, cursor.z].join(',')
    if (viewChanged || lastOverlay !== overlayKey) {
      paintTracking(ink, focus, cursorVisible)
      lastOverlay = overlayKey
    }
  }

  function setView(next: MapView) {
    if (next.u === view.u && next.v === view.v && next.zoom === view.zoom) return
    view = next
    keepCursorVisible()
    update()
  }

  function changeZoom(factor: number, anchor = project(cursor)) {
    if (gesture) return
    setView(zoomMap(view, view.zoom * factor, onMap(anchor) ? anchor : viewCenter))
  }

  function revealOnMap(point: Point) {
    const position = project(point)
    if (!onMap(position)) setView(panMap(view, { u: 0.5 - position.u, v: 0.5 - position.v }))
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
      cancelGesture()
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

  function pointerOnView(event: MouseEvent) {
    const { left, top, width, height } = canvas.getBoundingClientRect()
    return { u: (event.clientX - left) / width, v: (event.clientY - top) / height }
  }

  function cancelGesture() {
    if (!gesture) return
    const { id } = gesture
    gesture = undefined
    surface.classList.remove('is-dragging')
    if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id)
    update()
  }

  surface.addEventListener('pointerdown', (event) => {
    if (!ready || gesture || !event.isPrimary || event.button !== 0) return
    const draftPin = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-draft-id]') : null
    const draft = draftPin ? draftButtons.get(Number(draftPin.dataset.draftId))?.object : undefined
    if (event.target !== canvas && !draft) return
    event.preventDefault()
    const target = draftPin ?? canvas
    target.focus({ preventScroll: true })
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, view, draft, moved: false }
    surface.setPointerCapture(event.pointerId)
  }, events)

  function updateGesture(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.id) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    if (!gesture.moved && Math.hypot(dx, dy) < 4) return
    gesture.moved = true
    surface.classList.add('is-dragging')
    const { width, height } = canvas.getBoundingClientRect()
    const delta = { u: dx / width, v: dy / height }
    if (gesture.draft) {
      const start = mapPointInView(pointOnMap(gesture.draft), gesture.view)
      const { u, v } = clampMapPoint(viewPointOnMap({ u: start.u + delta.u, v: start.v + delta.v }, gesture.view))
      gesture.destination = roundedPoint(pointInWorld(u, v))
      update()
    }
    else {
      setView(panMap(gesture.view, delta))
    }
  }

  surface.addEventListener('pointermove', updateGesture, events)
  surface.addEventListener('pointerup', (event) => {
    if (!gesture || event.pointerId !== gesture.id) return
    updateGesture(event)
    if (!gesture) return
    const { draft, moved, destination } = gesture
    const position = pointerOnView(event)
    if (draft && !moved) controls.select(draft.id)
    else if (draft && destination && onMap(position)) moveDraft(draft, destination)
    else if (!moved && onMap(position)) {
      const { u, v } = viewPointOnMap(position, view)
      activate(pointInWorld(u, v))
    }
    cancelGesture()
  }, events)
  for (const type of ['lostpointercapture', 'pointercancel'] as const) {
    surface.addEventListener(type, (event) => {
      if (gesture?.id === event.pointerId) cancelGesture()
    }, events)
  }

  surface.addEventListener('wheel', (event) => {
    if (!event.deltaY) return
    event.preventDefault()
    const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1
    const exponent = Math.max(-0.5, Math.min(0.5, -event.deltaY * units * 0.006))
    changeZoom(Math.exp(exponent), pointerOnView(event))
  }, { ...events, passive: false })
  zoomIn.addEventListener('click', () => changeZoom(2), events)
  zoomOut.addEventListener('click', () => changeZoom(0.5), events)
  resetZoom.addEventListener('click', () => setView(fullMapView), events)

  toggle.addEventListener('click', () => {
    if (panel.hidden) show(true)
    else close()
  }, events)
  closeButton.addEventListener('click', close, events)
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    if (gesture) cancelGesture()
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
      changeZoom(event.key === '-' ? 0.5 : 2)
      return
    }
    const direction = directions[event.key]
    if (!direction) return
    event.preventDefault()
    const step = event.shiftKey ? 10 : 1
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
      ready = landscape && sceneReady && Boolean(ink && base)
      toggle.hidden = !landscape
      toggle.disabled = !ready
      if (!ready) show(false)
    },
    dispose() { abort.abort() },
  }
}
