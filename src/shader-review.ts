import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import '@babylonjs/core/Engines/AbstractEngine/abstractEngine.timeQuery'
import type { Engine } from '@babylonjs/core/Engines/engine'
import '@babylonjs/core/Engines/Extensions/engine.query'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Scene } from '@babylonjs/core/scene'
import { fieldStudyControls } from './interactive-shaders/field-controls'
import { objectiveLayer } from './objective-marker'
import { shellglassCycle, shellglassTideAt } from './shellglass-tide'
import type { ShaderQuality } from './shader-studies'
import { groundHeight, meadowFoot, meadowHill, pool, tidePool, waterLevel } from './terrain'

const sites = {
  shore: { point: tidePool, height: 0.20, alpha: -1.97, beta: 1.08, radius: 7.5, hour: 11.5, rain: 0 },
  meadow: { point: meadowFoot, height: 0.66, alpha: -1.72, beta: 1.35, radius: 6.5, hour: 15, rain: 0 },
  paving: { point: { x: 40, z: 8.24 }, height: 0.12, alpha: -0.19, beta: 1.47, radius: 10, hour: 12, rain: 0.65 },
  mist: { point: { x: pool.x, z: pool.z - 2 }, height: 0.84, alpha: 0.09, beta: 1.46, radius: 17, hour: 6.6, rain: 0 },
}

interface Measurement {
  warmup: number
  intervals: number[]
  render: number[]
  gpu: number[]
  lastGpuSample: number
}

function describe(samples: number[]) {
  if (!samples.length) return 'unavailable'
  samples.sort((a, b) => a - b)
  return [0.5, 0.95].map((p) => samples[Math.ceil(p * samples.length) - 1].toFixed(2)).join(' / ') + ' ms'
}

function keepCameraAboveTerrain(camera: ArcRotateCamera) {
  camera.getViewMatrix()
  const eye = camera.position
  const floor = Math.max(waterLevel, groundHeight(eye)) + 0.28
  if (eye.y < floor) {
    camera.beta = Math.max(camera.lowerBetaLimit ?? 0, Math.acos(Math.min(1, (floor - camera.target.y) / camera.radius)))
    camera.getViewMatrix()
  }
}

function createFieldCamera(scene: Scene) {
  const camera = new ArcRotateCamera('Shader field camera', 0, 1.1, 9, Vector3.Zero(), scene)
  camera.minZ = 0.065
  camera.maxZ = 620
  camera.lowerRadiusLimit = 1.5
  camera.layerMask &= ~objectiveLayer
  camera.lowerBetaLimit = 0.12
  camera.upperBetaLimit = Math.PI * 0.49
  camera.wheelDeltaPercentage = 0.06
  camera.panningSensibility = 0
  camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput')
  return camera
}

export function createShaderReview(scene: Scene, canvas: HTMLCanvasElement, engine: Engine, releaseMouse: () => void) {
  const initialSite = new URLSearchParams(location.search).get('shader-review')
  if (initialSite === null) return
  const panel = document.querySelector<HTMLElement>('#shader-review')!
  const siteSelect = panel.querySelector<HTMLSelectElement>('#shader-site')!
  const qualitySelect = panel.querySelector<HTMLSelectElement>('#shader-quality')!
  const meadowWalk = panel.querySelector<HTMLInputElement>('#shader-meadow-walk')!
  const tidePhase = panel.querySelector<HTMLInputElement>('#shader-tide')!
  const freeze = panel.querySelector<HTMLInputElement>('#shader-freeze')!
  const measure = panel.querySelector<HTMLButtonElement>('#shader-measure')!
  const output = panel.querySelector<HTMLOutputElement>('#shader-timing')!
  const abort = new AbortController()
  const events = { signal: abort.signal }
  const camera = createFieldCamera(scene)
  let stats: Measurement | undefined
  let lastFrameAt = 0
  let site: keyof typeof sites | undefined
  const gpuCounter = engine.getGPUFrameTimeCounter()
  const gpuSupported = Boolean(engine.getCaps().timerQuery)

  function cancelMeasurement() {
    if (!stats) return
    stats = undefined
    if (gpuSupported) engine.captureGPUFrameTime(false)
    output.value = 'Timing canceled. Hold the view steady and measure again.'
  }

  const studies = fieldStudyControls(panel, siteSelect, cancelMeasurement, events)
  let extra: ReturnType<typeof studies.select>

  function setMeadowTarget() {
    const start = sites.meadow.point
    const fraction = meadowWalk.valueAsNumber / 100
    const x = start.x + (meadowHill.x - start.x) * fraction
    const z = start.z + (meadowHill.z - start.z) * fraction
    camera.target.set(x, groundHeight({ x, z }) + sites.meadow.height, z)
    // Gain a little altitude as the viewpoint climbs the slope.
    camera.beta = sites.meadow.beta - fraction * 0.2
  }

  const tideClock = () => tidePhase.valueAsNumber / 100 * shellglassCycle
  function labelTide() {
    tidePhase.setAttribute('aria-valuetext', `${shellglassTideAt(tideClock()).phase}, ${tidePhase.value}% of cycle`)
  }

  function frameSite() {
    cancelMeasurement()
    output.value = ''
    camera.detachControl()
    const selection = siteSelect.value
    site = Object.hasOwn(sites, selection) ? selection as keyof typeof sites : undefined
    extra = studies.select(selection)
    const view = site ? sites[site] : extra
    canvas.toggleAttribute('data-shader-review', Boolean(view))
    meadowWalk.closest('label')!.hidden = site !== 'meadow'
    tidePhase.closest('label')!.hidden = site !== 'shore'
    measure.disabled = !view
    if (!view) return
    const { point, height, alpha, beta, radius } = view
    releaseMouse()
    camera.setTarget(new Vector3(point.x, Math.max(groundHeight(point), waterLevel) + height, point.z))
    camera.alpha = alpha
    camera.beta = beta
    camera.radius = radius
    camera.upperRadiusLimit = site === 'meadow' ? 42 : radius * 4
    camera.inertialAlphaOffset = camera.inertialBetaOffset = camera.inertialRadiusOffset = 0
    meadowWalk.value = '0'
    camera.attachControl(canvas, false)
  }

  siteSelect.value = [...siteSelect.options].some((option) => option.value === initialSite) ? initialSite : 'shore'
  frameSite()
  labelTide()
  panel.hidden = false
  siteSelect.addEventListener('change', frameSite, events)
  qualitySelect.addEventListener('change', () => {
    cancelMeasurement()
    output.value = ''
  }, events)
  freeze.addEventListener('change', cancelMeasurement, events)
  panel.querySelector('#shader-reset')!.addEventListener('click', frameSite, events)
  meadowWalk.addEventListener('input', () => {
    cancelMeasurement()
    setMeadowTarget()
  }, events)
  tidePhase.addEventListener('input', () => {
    cancelMeasurement()
    labelTide()
  }, events)
  canvas.addEventListener('pointerdown', cancelMeasurement, events)
  canvas.addEventListener('wheel', cancelMeasurement, events)
  window.addEventListener('resize', cancelMeasurement, events)
  document.addEventListener('visibilitychange', cancelMeasurement, events)
  measure.addEventListener('click', () => {
    if (gpuSupported) engine.captureGPUFrameTime(true)
    stats = { warmup: 45, intervals: [], render: [], gpu: [], lastGpuSample: gpuCounter.count }
    lastFrameAt = 0
    output.value = 'Warming up, then sampling 120 frames…'
  }, events)

  return {
    active: () => Boolean(site || extra),
    quality: () => qualitySelect.value as ShaderQuality,
    view(time: number) {
      const view = site ? sites[site] : extra
      if (!view) return
      const { hour, rain } = view
      scene.activeCamera = camera
      keepCameraAboveTerrain(camera)
      return { camera, time: freeze.checked || stats ? 7 : time, weather: { hour, rain }, tideTime: site === 'shore' ? tideClock() : undefined, inspection: studies.inspection() }
    },
    render() {
      const start = stats ? performance.now() : 0
      scene.render()
      if (!stats) return
      const renderMs = performance.now() - start
      const interval = lastFrameAt ? start - lastFrameAt : 0
      lastFrameAt = start
      if (stats.warmup-- > 0) return
      stats.intervals.push(interval)
      stats.render.push(renderMs)
      if (gpuSupported && gpuCounter.count > stats.lastGpuSample) {
        stats.gpu.push(gpuCounter.current / 1e6)
        stats.lastGpuSample = gpuCounter.count
      }
      if (stats.intervals.length < 120) return
      const frame = describe(stats.intervals), cpu = describe(stats.render), gpu = describe(stats.gpu)
      output.value = `${qualitySelect.selectedOptions[0].text} · ${engine.getRenderWidth()} × ${engine.getRenderHeight()} · 120 frames\n`
        + `p50 / p95 · Frame ${frame} · CPU render ${cpu} · GPU ${gpu}`
      stats = undefined
      if (gpuSupported) engine.captureGPUFrameTime(false)
    },
    dispose() {
      cancelMeasurement()
      abort.abort()
      camera.detachControl()
      camera.dispose()
      studies.dispose()
      canvas.removeAttribute('data-shader-review')
      panel.hidden = true
    },
  }
}
