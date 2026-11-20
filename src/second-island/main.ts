import { Camera } from '@babylonjs/core/Cameras/camera'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Engine } from '@babylonjs/core/Engines/engine'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Scene } from '@babylonjs/core/scene'
import { createCrew, poseCrew } from '../island-assets'
import { createIslandLighting, createMeshFactory } from '../island-meshes'
import { islandBuildings, buildingLocal } from './exteriors'
import { createLandscape } from './landscape'
import { createChart } from './map'
import { routes, sampleRoute } from './routes'
import { createScenery } from './scenery'
import { arrival, islandName, landmarks, sites, villages, wadeDepth, waterBounds } from './sites'
import type { MapPoint } from './sites'
import { dryLandKm2, groundHeight, shoreAccess, surfaceHeight, waterHeight } from './terrain'
import { tour } from './tour'
import './style.css'

function start() {
  const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
  document.title = `${islandName} · Mission Island`
  const canvas = get<HTMLCanvasElement>('island')
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true })
  const scene = new Scene(engine)
  scene.clearColor.set(.65, .79, .79, 1)
  scene.fogColor.set(.65, .79, .79)
  scene.fogMode = Scene.FOGMODE_LINEAR
  const lighting = createIslandLighting(scene)
  lighting.sunlight.shadowMaxZ = 1400
  lighting.sunlight.shadowOrthoScale = .04
  lighting.shadows.getShadowMap()?.resetRefreshCounter()
  const meshes = createMeshFactory(scene, lighting.shadows)
  const crew = createCrew(meshes, 0)
  const updateWater = createLandscape(meshes)
  const updateScenery = createScenery(meshes)
  const follow = new FreeCamera('Saltwind follow', new Vector3(arrival.x, 12, arrival.z - 19), scene)
  const overview = new FreeCamera('Saltwind overview', new Vector3(0, 910, -389), scene)
  overview.mode = Camera.ORTHOGRAPHIC_CAMERA
  overview.setTarget(new Vector3(0, 0, 8))
  for (const camera of [follow, overview]) { camera.minZ = .22; camera.maxZ = 1900 }
  follow.fov = .82
  scene.activeCamera = follow

  const atlas = get<HTMLDialogElement>('atlas')
  const select = get<HTMLSelectElement>('site')
  const drawMini = createChart(get<HTMLCanvasElement>('mini'), false)
  const drawMap = createChart(get<HTMLCanvasElement>('map'), true)
  const boot = get('boot'), journey = get('journey'), coordinates = get('coordinates')
  const discoveries = get('discoveries'), stage = get('stage-label'), place = get('place'), direction = get('direction')
  const tourButton = get<HTMLButtonElement>('tour'), overviewButton = get<HTMLButtonElement>('overview')
  const labels = get('world-labels'), performanceLabel = get('performance')
  const showPerformance = new URLSearchParams(location.search).has('perf')
  const area = dryLandKm2().toFixed(3)
  get('map-scale').textContent = `${area} km² of dry land · North is +Z · 1 unit = 1 metre`
  const known = new Set<string>(['ferry'])
  const keys = new Set<string>()
  const point = { x: arrival.x, z: arrival.z }
  let yaw = 0, orbit = 0, pitch = .48, arm = 12, cycle = 0, sceneTime = 0, lastDraw = -1
  let broad = false, stop = 0, playing = false, leg = 0, progress = 0, drag: PointerEvent | undefined
  let height = surfaceHeight(point.x, point.z)
  const worldLabels = landmarks.map((pin) => {
    const label = document.createElement('span')
    label.textContent = pin.name
    label.className = 'world-label'
    label.hidden = true
    labels.append(label)
    return { pin, label }
  })
  const stopLabels = tour.map(({ short }) => {
    const label = document.createElement('span')
    label.textContent = short
    get('stops').append(label)
    return label
  })
  for (const landmark of landmarks) select.add(new Option(landmark.name, landmark.id))
  select.value = 'ferry'

  function syncTour() {
    place.textContent = tour[stop].name
    direction.textContent = playing ? `Following the road to ${tour[stop + 1].name}. Walk at any time to take over.` : tour[stop].detail
    stage.textContent = playing ? 'Guided tour' : 'Development preview'
    tourButton.textContent = playing ? 'Pause tour' : stop === 0 ? 'Start tour' : stop === tour.length - 1 ? 'Restart tour' : 'Continue tour'
    stopLabels.forEach((label, i) => i === stop ? label.setAttribute('aria-current', 'step') : label.removeAttribute('aria-current'))
  }

  function setPoint(at: MapPoint, heading: number) {
    point.x = at.x
    point.z = at.z
    height = surfaceHeight(at.x, at.z)
    yaw = orbit = heading
    lastDraw = -1
  }

  function setOverview(value: boolean) {
    broad = value
    overviewButton.setAttribute('aria-pressed', String(value))
    scene.activeCamera = value ? overview : follow
    scene.fogStart = value ? 1150 : 320
    scene.fogEnd = value ? 1790 : 950
    scene.shadowsEnabled = !value
    lastDraw = -1
  }

  function reset() {
    setPoint(arrival, 0)
    arm = 12
    pitch = .48
    stop = leg = progress = 0
    playing = false
    setOverview(false)
    syncTour()
    canvas.focus()
  }

  function stopTour() {
    if (!playing) return
    playing = false
    syncTour()
  }

  function syncMap() {
    const landmark = landmarks.find(({ id }) => id === select.value) ?? landmarks[0]
    const site = sites.find(({ id }) => id === landmark.id)
    get('site-info').textContent = `${Math.round(landmark.x)} m X · ${Math.round(landmark.z)} m Z${site ? ` · ${site.width} × ${site.depth} m reserve. ${site.assets}.` : ''}`
    drawMap(point, known, landmark.id)
  }
  function openMap() {
    if (atlas.open) return
    keys.clear()
    stopTour()
    atlas.showModal()
    syncMap()
  }

  get('atlas-button').addEventListener('click', openMap)
  get('mini-button').addEventListener('click', openMap)
  get('atlas-close').addEventListener('click', () => atlas.close())
  overviewButton.addEventListener('click', () => setOverview(!broad))
  get('reset').addEventListener('click', reset)
  select.addEventListener('change', syncMap)
  get('inspect').addEventListener('click', () => {
    const landmark = landmarks.find(({ id }) => id === select.value)
    if (!landmark) return
    const site = sites.find(({ id }) => id === landmark.id)
    const target = site?.access ?? landmark
    const nearest = routes.flatMap(({ samples }) => samples).reduce((best, p) =>
      Math.hypot(p.x - target.x, p.z - target.z) < Math.hypot(best.x - target.x, best.z - target.z) ? p : best)
    setPoint(landmark.id === 'ferry' ? arrival : nearest, Math.atan2(landmark.x - nearest.x, landmark.z - nearest.z))
    arm = landmark.id === 'airport' || landmark.id === 'mine' || landmark.id === 'falls' ? 20 : 13
    stopTour()
    setOverview(false)
    place.textContent = landmark.name
    stage.textContent = 'Site inspection'
    direction.textContent = site?.assets ?? 'Walk from the access point to survey the landmark.'
    atlas.close()
    canvas.focus()
  })
  tourButton.addEventListener('click', () => {
    if (playing) { stopTour(); return }
    if (stop === tour.length - 1) reset()
    playing = true
    setOverview(false)
    syncTour()
    canvas.focus()
  })
  window.addEventListener('keydown', (event) => {
    if (atlas.open || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLSelectElement) return
    const key = event.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) {
      event.preventDefault()
      keys.add(key)
    }
    if (key === 'c' && !event.repeat) setOverview(!broad)
    if (key === 'm' && !event.repeat) openMap()
  })
  window.addEventListener('keyup', (event) => { keys.delete(event.key.toLowerCase()) })
  window.addEventListener('blur', () => { keys.clear() })
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    canvas.setPointerCapture(event.pointerId)
    drag = event
  })
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId || broad) return
    orbit -= (event.clientX - drag.clientX) * .005
    pitch = Math.max(.08, Math.min(1.22, pitch + (event.clientY - drag.clientY) * .004))
    drag = event
  })
  canvas.addEventListener('lostpointercapture', () => { drag = undefined })
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    arm = Math.max(3.4, Math.min(38, arm + event.deltaY * .018))
  }, { passive: false })

  function traversable(x: number, z: number) {
    const y = surfaceHeight(x, z)
    if (waterHeight(x, z) - y > wadeDepth || Math.abs(y - height) > .86) return false
    if (z < -252 && x > -280 && x < -268 && (x < -279.4 || x > -268.6 || z < -277.5)) return false
    return islandBuildings.every((building) => {
      const local = buildingLocal({ x, z }, building)
      return Math.abs(local.x) > building.width / 2 + .27 || Math.abs(local.z) > building.depth / 2 + .27
    })
  }

  function walk(dt: number) {
    const side = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
    const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'))
    if (!side && !forward) return 0
    stopTour()
    const angle = orbit + Math.atan2(side, forward)
    const speed = (keys.has('shift') ? 10 : 5.4) * (height < waterHeight(point.x, point.z) ? .58 : 1)
    const x = point.x + Math.sin(angle) * dt * speed, z = point.z + Math.cos(angle) * dt * speed
    if (traversable(x, point.z)) point.x = x
    if (traversable(point.x, z)) point.z = z
    height = surfaceHeight(point.x, point.z)
    yaw = angle
    return speed
  }

  function advance(dt: number) {
    const segment = tour[stop + 1].legs[leg]
    const speed = stop === 0 ? 17 : 28
    const direction = Math.sign(segment.to - segment.from)
    progress = Math.min(progress + dt * speed, Math.abs(segment.to - segment.from))
    const p = sampleRoute(segment.route, segment.from + progress * direction)
    const heading = p.yaw + (direction < 0 ? Math.PI : 0)
    point.x = p.x; point.z = p.z
    height = surfaceHeight(p.x, p.z)
    yaw = heading
    orbit += Math.atan2(Math.sin(heading - orbit), Math.cos(heading - orbit)) * Math.min(1, dt * 3)
    if (progress < Math.abs(segment.to - segment.from)) return
    progress = 0
    leg++
    if (leg === tour[stop + 1].legs.length) {
      stop++
      leg = 0
      playing = false
      syncTour()
    }
  }

  const cameraGoal = Vector3.Zero(), subject = Vector3.Zero(), worldIdentity = Matrix.Identity()
  function updateCamera(dt: number) {
    if (broad) return
    const distance = playing ? 30 : arm, angle = playing ? .58 : pitch
    const trailing = Math.cos(angle) * distance
    subject.set(point.x, height + (playing ? 3.7 : 1.6), point.z)
    const x = point.x - Math.sin(orbit) * trailing, z = point.z - Math.cos(orbit) * trailing
    const y = Math.max(height + 1.3 + Math.sin(angle) * distance, groundHeight(x, z) + 1.5)
    cameraGoal.set(x, y, z)
    for (let i = 2; i <= 13; i++) {
      const t = i / 13
      const px = subject.x + t * (x - subject.x), pz = subject.z + t * (z - subject.z)
      const obstruction = groundHeight(px, pz)
      if (obstruction + .45 > subject.y + t * (cameraGoal.y - subject.y)) cameraGoal.y = subject.y + (obstruction - subject.y + .45) / t
    }
    Vector3.LerpToRef(follow.position, cameraGoal, 1 - Math.exp(-dt * (playing ? 8 : 12)), follow.position)
    follow.setTarget(subject)
  }

  function updateLabels() {
    const camera = scene.activeCamera ?? follow
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    const ratioX = canvas.clientWidth / viewport.width, ratioY = canvas.clientHeight / viewport.height
    const visible = worldLabels.filter(({ pin }) => broad ? villages.some(({ id }) => pin.id === id) || pin.id === 'ferry' :
      known.has(pin.id) && Math.hypot(pin.x - point.x, pin.z - point.z) < 53).slice(0, broad ? 4 : 6)
    for (const entry of worldLabels) {
      const { pin, label } = entry
      if (!visible.includes(entry)) { label.hidden = true; continue }
      const y = groundHeight(pin.x, pin.z) + (broad ? 20 : 6)
      const projected = Vector3.Project(new Vector3(pin.x, y, pin.z), worldIdentity, scene.getTransformMatrix(), viewport)
      label.hidden = projected.z < 0 || projected.z > 1 || projected.x < 0 || projected.x > viewport.width || projected.y < 0 || projected.y > viewport.height
      if (label.hidden) continue
      label.style.left = `${projected.x * ratioX}px`
      label.style.top = `${projected.y * ratioY}px`
    }
  }

  function resize() {
    engine.resize()
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight())
    const half = Math.max(365, (waterBounds.maxX - waterBounds.minX) / (2 * aspect) - 30)
    overview.orthoTop = half; overview.orthoBottom = -half; overview.orthoLeft = -half * aspect; overview.orthoRight = half * aspect
  }
  new ResizeObserver(resize).observe(canvas)
  resize()
  setOverview(false)
  syncTour()
  updateCamera(1)
  engine.runRenderLoop(() => {
    const dt = Math.min(.065, engine.getDeltaTime() / 1000)
    sceneTime += dt
    const walking = atlas.open ? 0 : walk(dt)
    if (playing) advance(dt)
    cycle += dt * walking / 2.8
    crew.root.setEnabled(!broad && !playing)
    crew.root.position.set(point.x, height + .02, point.z)
    crew.root.rotation.y = yaw
    crew.blink(sceneTime)
    poseCrew(crew, cycle, walking ? Math.min(.85, walking * .1) : 0, false, undefined, 0, Math.min(1, dt * 10))
    for (const pin of landmarks) if (Math.hypot(point.x - pin.x, point.z - pin.z) <= pin.radius) known.add(pin.id)
    updateCamera(dt)
    const camera = scene.activeCamera ?? follow
    updateScenery(sceneTime, camera.position, broad)
    updateWater(sceneTime)
    scene.render()
    updateLabels()
    if (sceneTime - lastDraw > .24) {
      lastDraw = sceneTime
      const shore = shoreAccess(point.x, point.z)
      const edge = height < waterHeight(point.x, point.z) && shore.wade ? ' · Wade' : ''
      coordinates.textContent = `X ${Math.round(point.x)} · Z ${Math.round(point.z)} · ${height.toFixed(1)} m${edge}`
      discoveries.textContent = `${known.size}/${landmarks.length} found`
      drawMini(point, known)
      if (showPerformance) performanceLabel.textContent = `${Math.round(engine.getFps())} FPS`
    }
    if (!boot.hidden && scene.isReady()) {
      performance.mark('saltwind-ready')
      boot.hidden = true
      journey.hidden = get('mini-button').hidden = get('readout').hidden = false
      performanceLabel.hidden = !showPerformance
    }
  })
}

try { start() } catch (error) {
  document.getElementById('boot-message')!.textContent = 'The preview could not start. Reload with WebGL enabled.'
  console.error(error)
}
