import assert from 'node:assert/strict'
import test from 'node:test'
import { bindMapGestures } from '../src/workbench/landscape-map-gestures.ts'

const { Event, EventTarget } = globalThis

test('draft dragging commits on release and cancels when the draft changes or capture is lost', (t) => {
  class Surface extends EventTarget {
    classList = { add() {}, remove() {} }
    captured = new Set()
    dataset = {}

    setPointerCapture(id) { this.captured.add(id) }
    hasPointerCapture(id) { return this.captured.has(id) }
    releasePointerCapture(id) { this.captured.delete(id) }
    focus() {}
    closest() { return this.dataset.draftId ? this : null }
    getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 300 } }
  }
  const element = Object.getOwnPropertyDescriptor(globalThis, 'Element')
  Object.defineProperty(globalThis, 'Element', { configurable: true, value: Surface })
  t.after(() => element ? Object.defineProperty(globalThis, 'Element', element) : Reflect.deleteProperty(globalThis, 'Element'))
  const surface = new Surface(), canvas = new Surface(), pin = new Surface()
  pin.dataset.draftId = '2'
  const object = { id: 2, name: 'Crate', x: 0, z: 0 }
  const moves = [], pans = [], activations = []
  const gestures = bindMapGestures(surface, canvas, {}, {
    ready: () => true,
    view: () => ({ u: 0, v: 0, zoom: 2 }),
    getDraft: (id) => id === object.id ? object : undefined,
    setView: (view) => pans.push(view),
    changeZoom: () => {},
    preview: () => {},
    selectDraft: () => {},
    moveDraft: (draft, point) => moves.push([draft.id, point]),
    activate: (point) => activations.push(point),
  })
  const pointer = (type, target, clientX) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { pointerId: 1, isPrimary: true, button: 0, clientX, clientY: 120 })
    Object.defineProperty(event, 'target', { value: target })
    surface.dispatchEvent(event)
  }

  pointer('pointerdown', pin, 100)
  pointer('pointermove', surface, 140)
  const destination = gestures.drag.destination
  assert.ok(destination)
  assert.deepEqual(moves, [])
  pointer('pointerup', surface, 140)
  assert.deepEqual(moves, [[2, destination]])
  assert.equal(gestures.active, false)

  pointer('pointerdown', pin, 100)
  pointer('pointermove', surface, 140)
  assert.equal(gestures.cancelIfDraftChanged([{ ...object, x: 1 }]), true)
  pointer('pointerup', surface, 140)
  assert.equal(surface.hasPointerCapture(1), false)
  assert.equal(moves.length, 1)

  pointer('pointerdown', pin, 100)
  pointer('pointermove', surface, 140)
  pointer('lostpointercapture', surface, 140)
  pointer('pointerup', surface, 140)
  assert.equal(moves.length, 1)

  pointer('pointerdown', canvas, 100)
  pointer('pointermove', surface, 140)
  pointer('pointerup', surface, 140)
  assert.ok(pans.length > 0)
  assert.deepEqual(activations, [])
})
