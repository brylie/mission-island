import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation'
import type { Scene } from '@babylonjs/core/scene'
import { perfReadout } from './assets/recipes/debug-overlays'

const trianglesPerIndexTriple = 3

// A small corner readout of frame cost. Data attributes carry raw numbers for the capture CLI.
export function createPerfReadout(scene: Scene, host: HTMLElement = document.body) {
  const instrumentation = new SceneInstrumentation(scene)
  instrumentation.captureFrameTime = true
  const element = document.createElement('output')
  element.className = 'perf-readout'
  element.setAttribute('aria-live', 'off')
  Object.assign(element.style, perfReadout.style)
  host.append(element)
  let next = 0
  const observer = scene.onAfterRenderObservable.add(() => {
    const now = performance.now()
    if (now < next) return
    next = now + perfReadout.refreshMs
    const values = {
      fps: scene.getEngine().getFps().toFixed(0),
      frameMs: instrumentation.frameTimeCounter.lastSecAverage.toFixed(perfReadout.decimals),
      drawCalls: String(instrumentation.drawCallsCounter.current),
      meshes: String(scene.getActiveMeshes().length),
      triangles: String(Math.round(scene.getActiveIndices() / trianglesPerIndexTriple)),
    }
    Object.assign(element.dataset, values)
    element.textContent = `${values.fps} fps · ${values.frameMs} ms · ${values.drawCalls} draws · ${values.meshes} meshes · ${values.triangles} tris`
  })
  return () => {
    scene.onAfterRenderObservable.remove(observer)
    instrumentation.dispose()
    element.remove()
  }
}
