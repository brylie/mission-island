import { Camera } from '@babylonjs/core/Cameras/camera'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Engine } from '@babylonjs/core/Engines/engine'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Scene } from '@babylonjs/core/scene'
import { createCrew, poseCrew, poseSwimming } from '../assets/crew'
import { createAtmosphere } from '../island-atmosphere'
import { createIslandLighting, createMeshFactory } from '../island-meshes'
import { clearCameraDistance, placeWalker, ScenerySolids, walkSaltwind } from './walking'
import { villageWalks } from './footways'
import { displayCrewBank } from './crew-bank'
import { brinewickRainRoof } from './brinewick-market-art'
import { createHoneyDelivery } from './honey-delivery'
import { saltwindRainAt, saltwindWeather } from './weather'
import { createLandscape } from './landscape'
import { createChart } from './map'
import { routes, sampleRoute } from './routes'
import { createScenery } from './scenery'
import { arrival, discoveryWalks, islandName, landmarks, sites, villages, waterfront, waterBounds } from './sites'
import type { MapPoint } from './sites'
import { dryLandKm2, groundHeight, waterHeight } from './terrain'
import { tour } from './tour'
import { bindPlaytestCopy, readSaltwindView, saltwindLink } from '../playtest-link'
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
  const atmosphere = createAtmosphere(scene, lighting.sky, lighting.sunlight, lighting.shadows, 3350, brinewickRainRoof)
  lighting.sunlight.shadowMaxZ = 1400
  lighting.sunlight.shadowOrthoScale = .04
  lighting.shadows.getShadowMap()?.resetRefreshCounter()
  const meshes = createMeshFactory(scene, lighting.shadows)
  const crew = createCrew(meshes, 0)
  const solids = new ScenerySolids()
  const updateWater = createLandscape(meshes, solids)
  const updateScenery = createScenery(meshes, solids)
  const follow = new FreeCamera('Saltwind follow', new Vector3(arrival.x, 12, arrival.z - 19), scene)
  const overview = new FreeCamera('Saltwind overview', new Vector3(0, 910, -389), scene)
  overview.mode = Camera.ORTHOGRAPHIC_CAMERA
  overview.setTarget(new Vector3(0, 0, 8))
  for (const camera of [follow, overview]) { camera.minZ = .22; camera.maxZ = 1900 }
  follow.fov = .82
  scene.activeCamera = follow

  const atlas = get<HTMLDialogElement>('atlas')
  const select = get<HTMLSelectElement>('site')
  const climate = get<HTMLSelectElement>('survey-weather')
  const drawMini = createChart(get<HTMLCanvasElement>('mini'), false)
  const drawMap = createChart(get<HTMLCanvasElement>('map'), true)
  const boot = get('boot'), journey = get('journey'), coordinates = get('coordinates')
  const discoveries = get('discoveries'), stage = get('stage-label'), place = get('place'), direction = get('direction')
  const tourButton = get<HTMLButtonElement>('tour'), overviewButton = get<HTMLButtonElement>('overview')
  const labels = get('world-labels'), performanceLabel = get('performance')
  displayCrewBank(get('crew-bank'))
  const showPerformance = new URLSearchParams(location.search).has('perf')
  const area = dryLandKm2().toFixed(3)
  get('map-scale').textContent = `${area} km² of dry land · North is +Z · 1 unit = 1 metre`
  const known = new Set<string>(['ferry'])
  const keys = new Set<string>()
  const shared = readSaltwindView(new URLSearchParams(location.search))
  const resume = get<HTMLButtonElement>('resume-preview')
  let frozen = Boolean(shared), speed = shared?.speed ?? 0, inspectedSite = ''
  let fixedEye = shared?.eye
  function resumePreview() {
    fixedEye = undefined
    frozen = false
    resume.hidden = true
  }
  resume.addEventListener('click', resumePreview)
  const point = placeWalker(arrival)
  let yaw = 0, orbit = 0, pitch = .48, arm = 12, cycle = 0, sceneTime = 0, lastDraw = -1
  let broad = false, stop = 0, playing = false, leg = 0, progress = 0, drag: PointerEvent | undefined
  let jump = false, snapCamera = true
  const honey = createHoneyDelivery(meshes, crew, () => { resumePreview(); canvas.focus() })
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
  for (const landmark of landmarks) if (!landmark.discoverable) select.add(new Option(landmark.name, landmark.id))
  select.value = 'ferry'

  function syncTour() {
    inspectedSite = ''
    place.textContent = tour[stop].name
    direction.textContent = playing ? `Following the road to ${tour[stop + 1].name}. Walk at any time to take over.` : tour[stop].detail
    stage.textContent = playing ? 'Guided tour' : 'Development preview'
    tourButton.textContent = playing ? 'Pause tour' : stop === 0 && !leg && !progress ? 'Start tour' : stop === tour.length - 1 ? 'Restart tour' : 'Continue tour'
    tourButton.title = playing ? 'Pause at this point on the route' : stop === tour.length - 1
      ? 'Return to the ferry and start again' : 'Follow the route from the last tour position'
    stopLabels.forEach((label, i) => i === stop ? label.setAttribute('aria-current', 'step') : label.removeAttribute('aria-current'))
  }

  function setPoint(at: MapPoint, heading: number) {
    Object.assign(point, placeWalker(at))
    jump = false
    snapCamera = true
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
    resumePreview()
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
    jump = false
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
    resumePreview()
    const site = sites.find(({ id }) => id === landmark.id)
    const walk = villageWalks.find(({ name }) => name === landmark.id)
    const trail = discoveryWalks.find(route => route.id === landmark.id)
    const target = trail?.path[0] ?? walk?.points.at(-1) ?? site?.access ?? landmark
    const nearest = routes.flatMap(({ samples }) => samples).reduce((best, p) =>
      Math.hypot(p.x - target.x, p.z - target.z) < Math.hypot(best.x - target.x, best.z - target.z) ? p : best)
    const approach = landmark.id === 'ferry' ? arrival : landmark.id === 'apiary' ? { x: 187, z: 27 } : nearest
    const sight = walk?.points[0] ?? (landmark.id === 'rescue' ? waterfront.skiffLaunch : landmark)
    const dx = sight.x - approach.x, dz = sight.z - approach.z
    setPoint(approach, Math.hypot(dx, dz) < 1 ? nearest.yaw : Math.atan2(dx, dz))
    arm = landmark.id === 'airport' || landmark.id === 'mine' || landmark.id === 'falls' ? 20 : 13
    pitch = .18
    stopTour()
    setOverview(false)
    showSite(landmark.id)
    atlas.close()
    canvas.focus()
  })
  tourButton.addEventListener('click', () => {
    resumePreview()
    if (playing) { stopTour(); return }
    // Walking and site inspection leave the route cursor intact. Continue returns to that cursor.
    if (stop === tour.length - 1) reset()
    playing = true
    setOverview(false)
    syncTour()
    canvas.focus()
  })
  window.addEventListener('keydown', (event) => {
    if (atlas.open || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return
    const key = event.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) {
      event.preventDefault()
      resumePreview()
      keys.add(key)
    }
    if (key === ' ' && (event.target === canvas || event.target === document.body)) {
      event.preventDefault()
      if (!event.repeat) { resumePreview(); stopTour(); jump = true }
    }
    if (key === 'e' && !event.repeat) honey.interact()
    if (key === 'c' && !event.repeat) setOverview(!broad)
    if (key === 'm' && !event.repeat) openMap()
  })
  window.addEventListener('keyup', (event) => { keys.delete(event.key.toLowerCase()) })
  window.addEventListener('blur', () => { keys.clear(); jump = false })
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    canvas.setPointerCapture(event.pointerId)
    drag = event
  })
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId || broad) return
    fixedEye = undefined
    orbit -= (event.clientX - drag.clientX) * .005
    pitch = Math.max(.08, Math.min(1.22, pitch + (event.clientY - drag.clientY) * .004))
    drag = event
  })
  canvas.addEventListener('lostpointercapture', () => { drag = undefined })
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    fixedEye = undefined
    arm = Math.max(3.4, Math.min(38, arm + event.deltaY * .018))
  }, { passive: false })

  function walk(dt: number) {
    const side = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
    const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'))
    if (side || forward) stopTour()
    if (playing) return 0
    const angle = orbit + Math.atan2(side, forward)
    const pace = point.swimming ? 3.8 : (keys.has('shift') ? 10 : 5.4) * (point.y < waterHeight(point.x, point.z) ? .68 : 1)
    const speed = side || forward ? pace : 0
    if (speed) yaw = angle
    const moved = walkSaltwind(point, solids, Math.sin(angle) * speed, Math.cos(angle) * speed, jump, dt)
    jump = false
    return moved
  }

  function advance(dt: number) {
    const segment = tour[stop + 1].legs[leg]
    const speed = stop === 0 ? 17 : 28
    const direction = Math.sign(segment.to - segment.from)
    progress = Math.min(progress + dt * speed, Math.abs(segment.to - segment.from))
    const p = sampleRoute(segment.route, segment.from + progress * direction)
    const heading = p.yaw + (direction < 0 ? Math.PI : 0)
    Object.assign(point, placeWalker(p))
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
    subject.set(point.x, point.y + (playing ? 3.7 : 1.6), point.z)
    if (fixedEye) {
      follow.position.copyFromFloats(fixedEye[0], fixedEye[1], fixedEye[2])
      follow.setTarget(subject)
      return
    }
    const x = point.x - Math.sin(orbit) * trailing, z = point.z - Math.cos(orbit) * trailing
    const y = Math.max(point.y + 1.3 + Math.sin(angle) * distance, groundHeight(x, z) + 1.5)
    cameraGoal.set(x, y, z)
    for (let i = 2; i <= 13; i++) {
      const t = i / 13
      const px = subject.x + t * (x - subject.x), pz = subject.z + t * (z - subject.z)
      const obstruction = groundHeight(px, pz)
      if (obstruction + .45 > subject.y + t * (cameraGoal.y - subject.y)) cameraGoal.y = subject.y + (obstruction - subject.y + .45) / t
    }
    if (!playing) {
      const fraction = clearCameraDistance(point, solids, x - point.x, cameraGoal.y - subject.y, z - point.z)
      Vector3.LerpToRef(subject, cameraGoal, fraction, cameraGoal)
    }
    if (snapCamera || Vector3.DistanceSquared(cameraGoal, subject) < Vector3.DistanceSquared(follow.position, subject)) {
      follow.position.copyFrom(cameraGoal)
      snapCamera = false
    } else Vector3.LerpToRef(follow.position, cameraGoal, 1 - Math.exp(-dt * (playing ? 8 : 12)), follow.position)
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
  function showSite(id: string) {
    const landmark = landmarks.find(pin => pin.id === id)
    if (!landmark) return
    inspectedSite = id
    if (![...select.options].some(option => option.value === id)) select.add(new Option(landmark.name, id))
    known.add(id)
    select.value = id
    place.textContent = landmark.name
    stage.textContent = 'Site inspection'
    direction.textContent = discoveryWalks.find(walk => walk.id === id)?.detail ?? sites.find(site => site.id === id)?.assets ?? 'Walk from the access point to survey the landmark.'
  }
  if (shared) {
    Object.assign(point, shared.point)
    yaw = shared.yaw
    orbit = shared.orbit
    pitch = shared.pitch
    arm = shared.arm
    cycle = shared.cycle
    sceneTime = shared.time
    climate.value = shared.weather
    stop = Math.min(shared.tour.stop, tour.length - 1)
    const segment = tour[stop + 1]?.legs[shared.tour.leg]
    if (segment) {
      leg = shared.tour.leg
      progress = Math.min(shared.tour.progress, Math.abs(segment.to - segment.from))
      playing = shared.tour.playing
    }
    syncTour()
    updateCamera(1)
    setOverview(shared.overview)
    showSite(shared.site)
    resume.hidden = false
  }
  bindPlaytestCopy(() => saltwindLink(location.href, { point, yaw, orbit, pitch, arm, cycle, speed, time: sceneTime,
    eye: follow.position.asArray(), tour: { stop, leg, progress, playing }, weather: climate.value, overview: broad, site: inspectedSite }))
  updateCamera(1)
  function poseWalkingCrew(walking: number, dt: number) {
    if (point.swimming) poseSwimming(crew, sceneTime, Math.min(1, walking / 3.8))
    else poseCrew(crew, cycle, walking ? Math.min(.85, walking * .1) : 0, !point.grounded,
      honey.carrying() ? 'tool' : undefined, 0, frozen ? 1 : Math.min(1, dt * 10))
  }
  engine.runRenderLoop(() => {
    const dt = Math.min(.065, engine.getDeltaTime() / 1000)
    const simulationDelta = frozen ? 0 : dt
    sceneTime += simulationDelta
    if (!frozen) speed = atlas.open ? 0 : walk(dt)
    const walking = speed
    if (playing && !frozen) advance(dt)
    cycle += simulationDelta * walking / 2.8
    crew.root.setEnabled(!broad && !playing)
    crew.root.position.set(point.x, point.y + (point.swimming ? .036 * Math.sin(sceneTime * Math.PI * 1.25) : .02), point.z)
    crew.root.rotation.x = 0
    crew.root.rotation.y = yaw
    crew.blink(sceneTime)
    poseWalkingCrew(walking, dt)
    honey.update(point, !broad && !playing)
    for (const pin of landmarks) if (!known.has(pin.id) && Math.hypot(point.x - pin.x, point.z - pin.z) <= pin.radius) {
      known.add(pin.id)
      if (pin.discoverable) {
        if (playing) select.add(new Option(pin.name, pin.id))
        else {
          showSite(pin.id)
          stage.textContent = 'Discovered on foot'
        }
      }
    }
    updateCamera(dt)
    const camera = scene.activeCamera ?? follow
    const weather = saltwindWeather(climate.value, sceneTime)
    const light = atmosphere.update(sceneTime, weather, camera.position, !broad, { fogScale: 7 })
    const threats = point.y < waterHeight(point.x, point.z) - .04 ? [point] : []
    updateScenery({ time: sceneTime, delta: simulationDelta, weather, camera: camera.position, threats }, broad, climate.value === 'live' ? saltwindRainAt : undefined)
    updateWater(sceneTime, light)
    scene.render()
    updateLabels()
    if (sceneTime - lastDraw > .24) {
      lastDraw = sceneTime
      const edge = point.swimming ? ' · Swimming' : point.y < waterHeight(point.x, point.z) ? ' · Wading' : ''
      coordinates.textContent = `X ${Math.round(point.x)} · Z ${Math.round(point.z)} · ${point.y.toFixed(1)} m${edge}`
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
