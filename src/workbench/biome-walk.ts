import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import type { MeshFactory } from '../island-meshes'
import { createCrew, poseCrew } from '../assets/crew'
import type { habitatNavigation } from '../biome-navigation'
import type { Values } from './subject'
import type { Point } from '../world'

interface WalkState extends Point {
  heading: number
  overview?: { alpha: number; beta: number; radius: number; target: [number, number, number] }
}
// Population edits rebuild the scene while keeping its settings object.
const walks = new WeakMap<Values, WalkState>()

export function createBiomeWalk(meshes: MeshFactory, settings: Values, navigation: ReturnType<typeof habitatNavigation>) {
  const state = walks.get(settings) ?? { x: 0, z: -4.5, heading: 0 }
  walks.set(settings, state)
  const crew = createCrew(meshes, 0)
  crew.root.setEnabled(false)
  const canvas = meshes.scene.getEngine().getRenderingCanvas()
  const keys = new Set<string>()
  const movement = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD'])
  const clear = () => keys.clear()
  function down(event: KeyboardEvent) {
    if (!settings.walk || !movement.has(event.code) || event.altKey || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    keys.add(event.code)
  }
  const up = (event: KeyboardEvent) => keys.delete(event.code)
  const events = new AbortController()
  canvas?.addEventListener('keydown', down, events)
  canvas?.addEventListener('keyup', up, events)
  canvas?.addEventListener('blur', clear, events)
  window.addEventListener('blur', clear, events)
  meshes.scene.onDisposeObservable.addOnce(() => events.abort())
  let phase = 0
  return (delta: number): Point | undefined => {
    const cam = meshes.scene.activeCamera
    if (!(cam instanceof ArcRotateCamera)) return
    crew.root.setEnabled(Boolean(settings.walk))
    if (!settings.walk) {
      const saved = state.overview
      if (saved) {
        cam.target.set(...saved.target)
        Object.assign(cam, { alpha: saved.alpha, beta: saved.beta, radius: saved.radius })
        delete state.overview
        clear()
      }
      return
    }
    if (!state.overview) {
      state.overview = { alpha: cam.alpha, beta: cam.beta, radius: cam.radius, target: [cam.target.x, cam.target.y, cam.target.z] }
      cam.alpha = -Math.PI / 2
      cam.beta = 1.25
      cam.radius = 3.9
    }
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'))
    const sideways = Number(keys.has('KeyD')) - Number(keys.has('KeyA'))
    const step = 2.5 * delta / (Math.hypot(forward, sideways) || 1)
    const dx = (-forward * Math.cos(cam.alpha) - sideways * Math.sin(cam.alpha)) * step
    const dz = (-forward * Math.sin(cam.alpha) + sideways * Math.cos(cam.alpha)) * step
    const next = { x: state.x + dx, z: state.z + dz }
    const moving = Boolean(dx || dz) && navigation.clear(state, next)
    if (moving) {
      state.x = next.x
      state.z = next.z
      state.heading = Math.atan2(dx, dz)
      phase += delta * 1.65
    }
    const height = navigation.lift(state)
    crew.root.position.set(state.x, height, state.z)
    crew.root.rotation.y = state.heading
    poseCrew(crew, phase, moving ? .55 : 0, false)
    crew.blink(phase + performance.now() / 1000)
    cam.target.set(state.x, height + 1.03, state.z)
    cam.beta = Math.min(cam.beta, 1.55)
    return state
  }
}
