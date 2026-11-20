import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { stepPlayerOnTerrain } from '../../server/movement'
import { writeStorage } from '../browser-storage'
import { createSiteFeature } from '../site-props'
import { createCrew, createHomeChest, createFlatbed, createSupply, poseCrew, poseSwimming, swimmingHeight } from '../island-assets'
import type { MeshFactory } from '../island-meshes'
import { walkingHeight } from '../terrain'
import { crateSize, distance, jumpSpeed, truckStart } from '../world'
import { parkedTruckPose } from '../truck-pose'
import type { Point } from '../world'
import { draftLabels as labels, draftStorageKey } from './landscape-draft'
import type { createLandscapeDraft } from './landscape-draft'

type Draft = ReturnType<typeof createLandscapeDraft>
type DraftChange = ReturnType<Draft['undo']>
type Motor = Parameters<typeof stepPlayerOnTerrain>[0]

export type DraftMapObject = Point & { id: number; name: string }

function nodeFor(meshes: MeshFactory, placement: Draft['objects'][number]) {
  const crew = placement.kind === 'player' ? createCrew(meshes, 0) : undefined
  const root = crew?.root ?? new TransformNode(labels[placement.kind], meshes.scene)
  const y = walkingHeight(placement)
  const truckPose = placement.kind === 'truck' ? parkedTruckPose({ ...placement, heading: truckStart.heading }) : undefined
  root.position.set(placement.x, y, placement.z)
  const motor: Motor = { player: { ...placement, y, heading: 0, grounded: true, onBed: false, swimming: false }, verticalSpeed: 0 }
  if (placement.kind === 'crate') {
    const crate = createSupply(meshes, 'crate')
    crate.parent = root
    crate.position.y = crateSize / 2
  } else if (placement.kind === 'rock') {
    meshes.sphere(0, 0.37, 0, 2.24, 1.34, 1.81, meshes.paintSurface('stone'), root)
  } else if (placement.kind === 'tree') {
    meshes.cylinder(0, 1.1, 0, 0.32, 0.42, 2.2, 8, '#765b48', root)
    meshes.cylinder(0, 2.7, 0, 0.12, 3.1, 3.5, 9, meshes.paintSurface('leaves'), root)
  } else if (placement.kind === 'chest') {
    createHomeChest(meshes, { x: 0, z: 0 }, '#4faba4').root.parent = root
  } else if (placement.kind === 'rail' || placement.kind === 'bench' || placement.kind === 'planter') {
    const model = placement.kind
    createSiteFeature(meshes, { x: 0, z: 0, site: 'draft', name: labels[model], model, color: '#539285' }).parent = root
  } else if (truckPose) {
    const truck = createFlatbed(meshes)
    truck.root.parent = root
    root.position.y = truckPose.y
    root.rotation.set(truckPose.pitch, truckPose.heading, truckPose.roll)
  }
  return { placement, root, motor, crew, truckPose, stride: 0 }
}

export function createLandscapeLayout(meshes: MeshFactory, canvas: HTMLCanvasElement, draft: Draft,
  focus: () => Point & { yaw: number }) {
  const panel = document.getElementById('landscape-layout')!
  const kind = document.querySelector<HTMLSelectElement>('#landscape-kind')!
  const selected = document.querySelector<HTMLSelectElement>('#landscape-selected')!
  const status = document.getElementById('landscape-status')!
  const move = document.querySelector<HTMLButtonElement>('#landscape-move')!
  const remove = document.querySelector<HTMLButtonElement>('#landscape-remove')!
  const map = document.getElementById('landscape-map')!
  const mapStatus = document.getElementById('landscape-map-status')!
  const undoButtons = document.querySelectorAll<HTMLButtonElement>('[data-layout-history="undo"]')
  const redoButtons = document.querySelectorAll<HTMLButtonElement>('[data-layout-history="redo"]')
  const abort = new AbortController()
  const events = { signal: abort.signal }
  const objects = draft.objects.map((item) => nodeFor(meshes, item))
  const keys = new Set<string>()
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space'])
  let carriedTime = 0
  panel.hidden = false

  function refreshSelection(index = objects.length - 1) {
    selected.replaceChildren(...objects.map(({ placement }, i) =>
      new Option(`${i + 1}. ${labels[placement.kind]}`, String(i))))
    selected.selectedIndex = index
    move.disabled = remove.disabled = index < 0
  }

  function refreshHistory() {
    for (const button of undoButtons) button.disabled = !draft.canUndo
    for (const button of redoButtons) button.disabled = !draft.canRedo
  }

  function positionObject(object: typeof objects[number]) {
    const { x, z } = object.placement
    if (object.truckPose) {
      object.truckPose = parkedTruckPose({ x, z, heading: object.truckPose.heading })
      const { y, heading, pitch, roll } = object.truckPose
      object.root.position.set(x, y, z)
      object.root.rotation.set(pitch, heading, roll)
    } else {
      const y = walkingHeight({ x, z })
      object.root.position.set(x, y, z)
      if (object.crew) {
        Object.assign(object.motor.player, { x, y, z, grounded: true, onBed: false, swimming: false, truckSurface: undefined })
        object.motor.verticalSpeed = 0
        object.root.rotation.set(0, object.motor.player.heading, 0)
      }
    }
  }

  function showChange(change: DraftChange, message: string, feedback = status) {
    if (!change) return false
    const { index, action, object } = change
    if (action === 'insert') {
      objects.splice(index, 0, nodeFor(meshes, object))
      refreshSelection(index)
    } else if (action === 'remove') {
      const previous = selected.selectedIndex
      const [removed] = objects.splice(index, 1)
      removed.root.dispose()
      refreshSelection(previous > index ? previous - 1 : Math.min(previous, objects.length - 1))
    } else {
      positionObject(objects[index])
      selected.selectedIndex = index
    }
    refreshHistory()
    feedback.textContent = message
    return true
  }

  function stepHistory(direction: 'undo' | 'redo') {
    const change = draft[direction]()
    if (!change) return
    const actions = { place: 'placement', move: 'move', remove: 'removal' }
    const message = `${direction === 'undo' ? 'Undid' : 'Redid'} ${actions[change.type]} of ${labels[change.object.kind]}.`
    if (!map.hidden) status.textContent = ''
    showChange(change, message, map.hidden ? status : mapStatus)
  }

  const objectIndex = (id: number) => objects.findIndex(({ placement }) => placement.id === id)
  const placeAt = (point: Point) => showChange(draft.place(kind.value, point), 'Object placed.')
  document.getElementById('landscape-add')?.addEventListener('click', () => { placeAt(focus()) }, events)
  move.addEventListener('click', () => {
    showChange(draft.move(selected.selectedIndex, focus()), 'Object moved.')
  }, events)
  remove.addEventListener('click', () => {
    showChange(draft.remove(selected.selectedIndex), 'Object removed from the draft.')
  }, events)
  for (const button of undoButtons) button.addEventListener('click', () => stepHistory('undo'), events)
  for (const button of redoButtons) button.addEventListener('click', () => stepHistory('redo'), events)
  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || (!event.metaKey && !event.ctrlKey)) return
    const target = event.target
    if (target instanceof HTMLElement && (target.isContentEditable ||
      target.matches('textarea, input:not([type="range"], [type="checkbox"], [type="radio"])'))) return
    const key = event.key.toLowerCase()
    if (key !== 'z' && !(key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey)) return
    event.preventDefault()
    if (!event.repeat) stepHistory(key === 'y' || event.shiftKey ? 'redo' : 'undo')
  }, events)
  document.getElementById('landscape-save')?.addEventListener('click', () => {
    status.textContent = writeStorage('localStorage', draftStorageKey, JSON.stringify(draft.placements()))
      ? 'Draft saved in this browser.' : 'Browser storage is unavailable. Export the draft as JSON.'
  }, events)
  document.getElementById('landscape-export')?.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft.placements(), null, 2) + '\n'], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'mission-island-layout.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, events)

  canvas.addEventListener('keydown', (event) => {
    const object = objects[selected.selectedIndex]
    if (!object?.crew || !movementKeys.has(event.code)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    keys.add(event.code)
    const { motor } = object
    if (event.code === 'Space' && !event.repeat && motor.player.grounded && !motor.player.swimming) {
      motor.player.grounded = motor.player.onBed = false
      motor.player.truckSurface = undefined
      motor.verticalSpeed = jumpSpeed
    }
  }, { ...events, capture: true })
  window.addEventListener('keyup', (event) => keys.delete(event.code), events)
  canvas.addEventListener('blur', () => keys.clear(), events)
  refreshSelection()
  refreshHistory()
  status.textContent = ''

  function draftedSurface(point: Point, margin: number) {
    let top = -Infinity
    for (const { placement, root } of objects) {
      const { kind } = placement
      if (kind === 'crate' && Math.abs(point.x - placement.x) < crateSize / 2 + margin &&
        Math.abs(point.z - placement.z) < crateSize / 2 + margin) top = Math.max(top, root.position.y + crateSize)
      if (kind === 'rock' && distance(point, placement) < 1.05 + margin) top = Math.max(top, root.position.y + 1.04)
      if (kind === 'tree' && distance(point, placement) < 0.24 + margin) top = Math.max(top, root.position.y + 2.2)
    }
    return top
  }

  return {
    placeAt,
    moveAt: (id: number, point: Point) => showChange(draft.move(objectIndex(id), point), 'Object moved.'),
    select(id: number) {
      const index = objectIndex(id)
      if (index >= 0) selected.selectedIndex = index
    },
    mapObjects: (): DraftMapObject[] => draft.objects.map(({ id, kind, x, z }, index) => ({
      id, name: `${labels[kind]} ${index + 1}`, x, z,
    })),
    meshes: () => objects.flatMap(({ root }) => root.getChildMeshes()),
    update(delta: number, time: number) {
      const current = objects[selected.selectedIndex]
      if (!current?.crew) return
      const dx = Number(keys.has('KeyD')) - Number(keys.has('KeyA'))
      const dz = Number(keys.has('KeyW')) - Number(keys.has('KeyS'))
      const { yaw } = focus()
      const input = {
        x: dx * Math.cos(yaw) + dz * Math.sin(yaw), z: dz * Math.cos(yaw) - dx * Math.sin(yaw),
        sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'), spray: false, careful: false,
      }
      const trucks = objects.flatMap(({ truckPose }) => truckPose ? [truckPose] : [])
      carriedTime += delta
      while (carriedTime >= 1 / 30) {
        stepPlayerOnTerrain(current.motor, trucks, input, false, 1 / 30, draftedSurface)
        carriedTime -= 1 / 30
      }
      const { player } = current.motor
      current.placement.x = player.x
      current.placement.z = player.z
      current.root.position.set(player.x, player.swimming ? swimmingHeight(time) : player.y + 0.05, player.z)
      current.root.rotation.set(0, player.heading, 0)
      const moving = Boolean(dx || dz)
      if (moving) current.stride += delta * (input.sprint ? 2.5 : 1.7)
      if (player.swimming) poseSwimming(current.crew, time, Number(moving))
      else poseCrew(current.crew, current.stride, moving ? 0.64 : 0, !player.grounded)
      current.crew.blink(time)
      if (document.activeElement === canvas) {
        status.textContent = `${player.x.toFixed(1)} m X · ${player.z.toFixed(1)} m Z · ${player.y.toFixed(1)} m high`
      }
    },
    dispose() {
      abort.abort()
      panel.hidden = true
    },
  }
}
