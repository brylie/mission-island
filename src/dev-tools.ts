import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Scene } from '@babylonjs/core/scene'
import { createDebugOverlayView } from './debug-overlay-view'
import { debugOverlays } from './debug-overlays/catalog'
import type { OverlayContext } from './debug-overlays/registry'
import { readDevView, type DevView } from './dev-view'
import { createPerfReadout } from './perf-readout'
import { applyRenderMode } from './render-modes'

// Dev servers and the playtest host read the dev view. A production build has neither mode, so it never does.
const devToolsAvailable = import.meta.env.DEV || import.meta.env.MODE === 'playtest'

function overlayPanel(view: ReturnType<typeof createDebugOverlayView>) {
  const panel = document.createElement('fieldset')
  panel.className = 'debug-overlay-panel'
  panel.append(Object.assign(document.createElement('legend'), { textContent: 'Debug overlays' }))
  for (const layer of debugOverlays.layers) {
    const label = document.createElement('label')
    const box = Object.assign(document.createElement('input'), { type: 'checkbox', checked: view.shown().includes(layer.id) })
    box.addEventListener('change', () => view.toggle(layer.id))
    label.title = layer.description
    label.append(box, ' ', layer.label)
    panel.append(label)
  }
  document.body.append(panel)
  return panel
}

// Fixed camera, sky, overlays, render mode and perf readout from the page query.
export function createDevTools(scene: Scene, canvas: HTMLCanvasElement, params = new URLSearchParams(location.search)) {
  let view: DevView | undefined
  try {
    view = devToolsAvailable ? readDevView(params) : undefined
  }
  catch (error) {
    document.body.dataset.devViewError = (error as Error).message
    throw error
  }
  if (!view) return
  const { camera: fixed, sky, mode } = view
  const camera = fixed && new ArcRotateCamera('Dev view camera', fixed.alpha, fixed.beta, fixed.radius, Vector3.FromArray(fixed.target), scene)
  if (camera) {
    camera.fov = fixed.fov
    camera.minZ = scene.activeCamera?.minZ ?? camera.minZ
    camera.maxZ = scene.activeCamera?.maxZ ?? camera.maxZ
    camera.attachControl(canvas, true)
  }
  const overlays = createDebugOverlayView(scene)
  overlays.set(view.overlays)
  const panel = view.capture ? undefined : overlayPanel(overlays)
  const stopPerf = view.perf ? createPerfReadout(scene) : undefined
  if (view.capture) document.body.classList.add('dev-capture')
  let moded = false
  // A handle for agents driving the page: toggle overlays or read the scene from the console or Playwright.
  Object.assign(window, { missionDev: { overlays, scene, view } })
  return {
    camera,
    weather: sky,
    overlays,
    frame(context: OverlayContext, seconds: number) {
      overlays.update(context, seconds)
      const active = camera ?? scene.activeCamera
      if (!moded && active) {
        applyRenderMode(scene, active, mode)
        moded = true
      }
    },
    dispose() {
      overlays.dispose()
      stopPerf?.()
      panel?.remove()
      camera?.dispose()
    },
  }
}
