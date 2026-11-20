import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { stepPlayer } from '../../server/movement'
import { createCrew, createFlatbed, createSupply, poseCrew } from '../island-assets'
import type { MeshFactory } from '../island-meshes'
import { walkingHeight } from '../terrain'
import { crateSize, distance, jumpSpeed, truckStart } from '../world'
import type { Point, Pose } from '../world'

const store = 'mission-island-landscape-layout'
const labels = { player: 'Test player', crate: 'Crate', rock: 'Rock', tree: 'Tree', truck: 'Flatbed' } as const
type Kind = keyof typeof labels
type Placement = Point & { kind: Kind }
type Motor = Parameters<typeof stepPlayer>[0]

function loadLayout(): Placement[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(store) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, 60).filter((item: unknown): item is Placement => {
      if (typeof item !== 'object' || item === null) return false
      const point = item as Partial<Placement>
      return typeof point.kind === 'string' && Object.hasOwn(labels, point.kind) &&
        typeof point.x === 'number' && Number.isFinite(point.x) && typeof point.z === 'number' && Number.isFinite(point.z)
    })
  } catch {
    return []
  }
}

function nodeFor(meshes: MeshFactory, placement: Placement) {
  const crew = placement.kind === 'player' ? createCrew(meshes, 0) : undefined
  const root = crew?.root ?? new TransformNode(labels[placement.kind], meshes.scene)
  const y = walkingHeight(placement)
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
  } else if (placement.kind === 'truck') {
    const truck = createFlatbed(meshes)
    truck.root.parent = root
    root.rotation.y = truckStart.heading
  }
  return { placement, root, motor, crew, stride: 0 }
}

export function createLandscapeLayout(meshes: MeshFactory, canvas: HTMLCanvasElement, focus: () => Point & { yaw: number }) {
  const panel = document.getElementById('landscape-layout')!
  const kind = document.querySelector<HTMLSelectElement>('#landscape-kind')!
  const selected = document.querySelector<HTMLSelectElement>('#landscape-selected')!
  const status = document.getElementById('landscape-status')!
  const move = document.querySelector<HTMLButtonElement>('#landscape-move')!
  const remove = document.querySelector<HTMLButtonElement>('#landscape-remove')!
  const abort = new AbortController()
  const events = { signal: abort.signal }
  const objects = loadLayout().map((item) => nodeFor(meshes, item))
  const keys = new Set<string>()
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space'])
  let carriedTime = 0
  panel.hidden = false

  function refresh(index = objects.length - 1) {
    selected.replaceChildren(...objects.map(({ placement }, i) =>
      new Option(`${i + 1}. ${labels[placement.kind]}`, String(i))))
    selected.selectedIndex = index
    move.disabled = remove.disabled = index < 0
  }

  function drop(placement: Placement, index: number) {
    if (objects[index]) objects[index].root.dispose()
    objects[index] = nodeFor(meshes, placement)
    refresh(index)
  }

  document.getElementById('landscape-add')?.addEventListener('click', () => {
    if (objects.length >= 60 || !Object.hasOwn(labels, kind.value)) return
    const { x, z } = focus()
    drop({ kind: kind.value as Kind, x, z }, objects.length)
    status.textContent = 'Object placed.'
  }, events)
  move.addEventListener('click', () => {
    const index = selected.selectedIndex
    const object = objects[index]
    if (!object) return
    const { x, z } = focus()
    drop({ kind: object.placement.kind, x, z }, index)
    status.textContent = 'Object moved.'
  }, events)
  remove.addEventListener('click', () => {
    const [object] = objects.splice(selected.selectedIndex, 1)
    object?.root.dispose()
    refresh()
    status.textContent = 'Object removed from the draft.'
  }, events)
  const layout = () => objects.map(({ placement }) => placement)
  document.getElementById('landscape-save')?.addEventListener('click', () => {
    try {
      localStorage.setItem(store, JSON.stringify(layout()))
      status.textContent = 'Draft saved in this browser.'
    } catch {
      status.textContent = 'Browser storage is unavailable. Export the draft as JSON.'
    }
  }, events)
  document.getElementById('landscape-export')?.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(layout(), null, 2) + '\n'], { type: 'application/json' }))
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
  refresh()
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
      const truck = objects.find(({ placement }) => placement.kind === 'truck')
      const pose: Pose = truck ? { ...truck.placement, heading: truckStart.heading } : { x: 1000, z: 1000, heading: 0 }
      carriedTime += delta
      while (carriedTime >= 1 / 30) {
        stepPlayer(current.motor, pose, pose, input, false, 1 / 30, draftedSurface)
        carriedTime -= 1 / 30
      }
      const { player } = current.motor
      current.placement.x = player.x
      current.placement.z = player.z
      current.root.position.set(player.x, player.y + 0.05, player.z)
      current.root.rotation.set(player.swimming ? 0.95 : 0, player.heading, 0)
      const moving = Boolean(dx || dz)
      if (moving) current.stride += delta * (input.sprint ? 2.5 : 1.7)
      poseCrew(current.crew, current.stride, moving ? 0.64 : 0, !player.grounded)
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
