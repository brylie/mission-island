import type { Point } from '../world.ts'
import { wheelDeltaUnits } from './inspection-input.ts'
import type { DraftMapObject } from './landscape-layout'
import { clampMapPoint, mapPointInView, onMap, panMap, pointInWorld, pointOnMap, roundedPoint, viewPointOnMap } from './landscape-map-projection.ts'
import type { MapPoint, MapView } from './landscape-map-projection.ts'

const dragThreshold = 4
const maxWheelStep = 0.5
const wheelRate = 0.006

interface PointerStart {
  id: number
  x: number
  y: number
  view: MapView
  moved: boolean
}

type PointerGesture = PointerStart & (
  | { kind: 'pan' }
  | { kind: 'draft', object: DraftMapObject, destination?: Point }
)

interface GestureControls {
  ready(): boolean
  view(): MapView
  getDraft(id: number): DraftMapObject | undefined
  setView(view: MapView): void
  changeZoom(factor: number, anchor: MapPoint): void
  preview(): void
  selectDraft(id: number): void
  moveDraft(object: DraftMapObject, point: Point): void
  activate(point: Point): void
}

export function bindMapGestures(surface: HTMLElement, canvas: HTMLCanvasElement, events: AddEventListenerOptions, controls: GestureControls) {
  let gesture: PointerGesture | undefined

  function pointerOnView(event: MouseEvent) {
    const { left, top, width, height } = canvas.getBoundingClientRect()
    return { u: (event.clientX - left) / width, v: (event.clientY - top) / height }
  }

  function cancel() {
    if (!gesture) return
    const { id } = gesture
    gesture = undefined
    surface.classList.remove('is-dragging')
    if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id)
    controls.preview()
  }

  surface.addEventListener('pointerdown', (event) => {
    if (!controls.ready() || gesture || !event.isPrimary || event.button !== 0) return
    const pin = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-draft-id]') : null
    const object = pin ? controls.getDraft(Number(pin.dataset.draftId)) : undefined
    if (event.target !== canvas && !object) return
    event.preventDefault()
    const target = pin ?? canvas
    target.focus({ preventScroll: true })
    const start = { id: event.pointerId, x: event.clientX, y: event.clientY, view: controls.view(), moved: false }
    gesture = object ? { ...start, kind: 'draft', object } : { ...start, kind: 'pan' }
    surface.setPointerCapture(event.pointerId)
  }, events)

  function updateGesture(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.id) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    if (!gesture.moved && Math.hypot(dx, dy) < dragThreshold) return
    gesture.moved = true
    surface.classList.add('is-dragging')
    const { width, height } = canvas.getBoundingClientRect()
    const delta = { u: dx / width, v: dy / height }
    if (gesture.kind === 'draft') {
      const start = mapPointInView(pointOnMap(gesture.object), gesture.view)
      const { u, v } = clampMapPoint(viewPointOnMap({ u: start.u + delta.u, v: start.v + delta.v }, gesture.view))
      gesture.destination = roundedPoint(pointInWorld(u, v))
      controls.preview()
    }
    else {
      controls.setView(panMap(gesture.view, delta))
    }
  }

  surface.addEventListener('pointermove', updateGesture, events)
  surface.addEventListener('pointerup', (event) => {
    if (!gesture || event.pointerId !== gesture.id) return
    updateGesture(event)
    if (!gesture) return
    const position = pointerOnView(event)
    if (gesture.kind === 'draft') {
      if (!gesture.moved) controls.selectDraft(gesture.object.id)
      else if (gesture.destination && onMap(position)) controls.moveDraft(gesture.object, gesture.destination)
    }
    else if (!gesture.moved && onMap(position)) {
      const { u, v } = viewPointOnMap(position, controls.view())
      controls.activate(pointInWorld(u, v))
    }
    cancel()
  }, events)
  for (const type of ['lostpointercapture', 'pointercancel'] as const) {
    surface.addEventListener(type, (event) => {
      if (gesture?.id === event.pointerId) cancel()
    }, events)
  }

  surface.addEventListener('wheel', (event) => {
    if (!event.deltaY) return
    event.preventDefault()
    const units = wheelDeltaUnits(event.deltaMode, canvas.clientHeight)
    const exponent = Math.max(-maxWheelStep, Math.min(maxWheelStep, -event.deltaY * units * wheelRate))
    controls.changeZoom(Math.exp(exponent), pointerOnView(event))
  }, { ...events, passive: false })

  return {
    get active() { return Boolean(gesture) },
    get moved() { return Boolean(gesture?.moved) },
    get drag() { return gesture?.kind === 'draft' ? gesture : undefined },
    cancel,
    cancelIfDraftChanged(objects: readonly DraftMapObject[]) {
      if (gesture?.kind !== 'draft') return false
      const { id, x, z } = gesture.object
      if (objects.some((object) => object.id === id && object.x === x && object.z === z)) return false
      cancel()
      return true
    },
  }
}
