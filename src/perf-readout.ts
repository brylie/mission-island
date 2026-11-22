import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine'
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation'
import type { Scene } from '@babylonjs/core/scene'

const refreshMs = 500
const indicesPerTriangle = 3
const trianglesPerThousand = 1000
const frameDecimals = 1

// With `?perf` in the address, a corner readout shows the frame rate, frame time, draw calls, active
// meshes and drawn triangles. Compare scenery changes on the same machine, camera and route. The
// readout also keeps its latest numbers in data attributes so a test browser can read them.
export function createPerfReadout(scene: Scene, engine: AbstractEngine) {
  if (!new URLSearchParams(location.search).has('perf')) return
  const instrumentation = new SceneInstrumentation(scene)
  instrumentation.captureFrameTime = true
  const label = document.createElement('output')
  label.className = 'perf-readout'
  document.body.append(label)
  const loadMs = Math.round(performance.now())
  let next = 0
  scene.onAfterRenderObservable.add(() => {
    const now = performance.now()
    // Wait for the first measured frames before reporting.
    if (now < next || !Number.isFinite(engine.getFps())) return
    next = now + refreshMs
    const reading = {
      fps: Math.round(engine.getFps()),
      frameMs: instrumentation.frameTimeCounter.lastSecAverage.toFixed(frameDecimals),
      drawCalls: instrumentation.drawCallsCounter.current,
      meshes: scene.getActiveMeshes().length,
      triangles: Math.round(scene.getActiveIndices() / indicesPerTriangle),
      loadMs,
    }
    Object.assign(label.dataset, Object.fromEntries(Object.entries(reading).map(([key, value]) => [key, String(value)])))
    label.textContent = `${reading.fps} FPS · ${reading.frameMs} ms · ${reading.drawCalls} draws · ${reading.meshes} meshes · ${Math.round(reading.triangles / trianglesPerThousand)}k tris`
  })
}
