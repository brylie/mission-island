import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { ridgeScoutMotion, ridgeScoutViews } from '../assets/recipes/workbench-ridge-scout'
import { createCrew, poseCrew } from '../assets/crew'
import type { MeshFactory } from '../island-meshes'
import { ridgeStep, startRidgeFlight, stepRidgeFlight } from '../simulation/ridge-flight'
import { stepPlayerOnTerrain } from '../simulation/movement'
import { groundHeight } from '../terrain'
import { distance } from '../world'
import { ridgeHeading, ridgeLaunch, ridgeMeadow, ridgeReturn } from '../worlds/starter/ridge-scout'
import { mirrorPoolWillow } from '../worlds/starter/sites'
import { createRidgeCourse, createHangGlider, poseHangGliderPilot } from '../assets/ridge-glider'
import { createRidgeUpdraft } from '../assets/ridge-updraft'
import { createRidgeFlightOrbs } from '../assets/ridge-flight-orbs'
import { control, type Entry } from './subject'

const halves = 2
const maxFrameSeconds = 0.25
const aheadBearingRadians = 0.21
const clearanceDisplayDecimals = 2

function createScoutControls(meshes: MeshFactory) {
  const canvas = meshes.scene.getEngine().getRenderingCanvas()
  const keys = new Set<string>()
  const pending = new Set<string>()
  const commands = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyC', 'KeyR'])
  const taps = new Set(['KeyE', 'KeyC', 'KeyR'])
  const events = new AbortController()
  const clear = () => {
    keys.clear()
    pending.clear()
  }
  canvas?.addEventListener('keydown', (event) => {
    if (!commands.has(event.code) || event.altKey || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    if (event.repeat) return
    if (taps.has(event.code)) pending.add(event.code)
    else keys.add(event.code)
  }, events)
  window.addEventListener('keyup', (event) => keys.delete(event.code), events)
  canvas?.addEventListener('blur', clear, events)
  window.addEventListener('blur', clear, events)
  meshes.scene.onDisposeObservable.addOnce(() => events.abort())
  return {
    releaseMovement: () => keys.clear(),
    consume: (key: string) => pending.delete(key),
    steer: () => Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
    forward: () => Number(keys.has('KeyW')) - Number(keys.has('KeyS')),
  }
}

function scoutWalker() {
  return { player: { ...ridgeLaunch, y: groundHeight(ridgeLaunch), heading: ridgeHeading, grounded: true, swimming: false, onBed: false }, verticalSpeed: 0 }
}

function returnHeading(point: { x: number, z: number }) {
  const { arrivalRadius, launchDistance } = ridgeScoutMotion.returnWaypoint
  const waypoint = distance(point, ridgeReturn) > arrivalRadius && distance(point, ridgeLaunch) > launchDistance ? ridgeReturn : ridgeLaunch
  return Math.atan2(waypoint.x - point.x, waypoint.z - point.z)
}

function updateScoutCamera(camera: ArcRotateCamera, pilot: ReturnType<typeof createCrew>['root'], overview: boolean) {
  const { overview: aerial, follow } = ridgeScoutViews
  if (overview) {
    camera.target.set(0, 0, aerial.focusZ)
    camera.getScene().fogStart = aerial.fogStart
    camera.getScene().fogEnd = aerial.fogEnd
  }
  else {
    const yaw = pilot.rotation.y
    camera.target.set(pilot.position.x + Math.sin(yaw) * follow.lookAhead, pilot.position.y + follow.aimHeight, pilot.position.z + Math.cos(yaw) * follow.lookAhead)
  }
}

function aimScoutCamera(camera: ArcRotateCamera, heading: number, overview: boolean, returning: boolean) {
  const { overview: aerial, follow, zoom } = ridgeScoutViews
  camera.lowerRadiusLimit = zoom.minimum
  camera.upperRadiusLimit = zoom.maximum
  camera.alpha = overview ? -Math.PI / halves : Math.PI * follow.alphaHalfTurns - heading
  camera.beta = overview ? aerial.beta : returning ? follow.returnBeta : follow.beta
  camera.radius = overview ? aerial.radius : follow.radius
}

export const ridgeScoutStudy: Entry = {
  id: 'ridge-glider-scout',
  name: 'Windstone Ridge glider scout',
  group: 'Island',
  source: 'src/simulation/ridge-flight.ts',
  description: 'Choose On the island and focus the viewport to scout, fly, and walk back. Inspect the wing and harness in the studio.',
  readout: 'Ridge scout',
  cameraRadius: ridgeScoutViews.studio.radius,
  angle: ridgeScoutViews.studio.angle,
  fieldSite: () => ({ name: 'Windstone Ridge, Starter Island', offset: { x: 0, y: 0, z: 0 } }),
  weather: () => ({ hour: ridgeScoutViews.studio.hour, rain: 0 }),
  controls: [
    control('crew', 'Crew fitting', '0', { 0: 'Amber crew', 1: 'Blue crew' }),
    control('route', 'Flight destination', 'checkout', { checkout: 'Landing circle', survey: 'Mirror Pool willow' }),
  ],
  create(meshes, _, _reportError, observe, field) {
    const crew = createCrew(meshes, 0)
    const wing = createHangGlider(meshes)
    if (!field) return ({ delta }, { crew: fitting }) => {
      crew.setAppearance(undefined, { base: Number(fitting) })
      poseHangGliderPilot(crew, Math.min(1, delta * ridgeScoutMotion.pose.blendRate))
      observe('Choose On the island to fly this wing over Starter Island.')
    }

    const { rack } = createRidgeCourse(meshes)
    const drawUpdraft = createRidgeUpdraft(meshes)
    const showRoute = createRidgeFlightOrbs(meshes)
    wing.parent = rack
    const controls = createScoutControls(meshes)
    let walker = scoutWalker()
    let flight: ReturnType<typeof startRidgeFlight> | undefined
    let overview = false
    let initializeCamera = true
    let accumulator = 0
    let walkCycle = 0
    let walkStride = 0
    let windTime = 0
    let returning = false
    let recovering = false
    const atLaunch = () => walker.player.grounded && distance(walker.player, ridgeLaunch) < ridgeScoutMotion.launchRadius

    function begin() {
      controls.releaseMovement()
      flight = startRidgeFlight()
      overview = false
      initializeCamera = true
      returning = recovering = false
    }

    function fly() {
      if (!flight) return
      stepRidgeFlight(flight, { turn: controls.steer(), pitch: controls.forward() })
      if (!flight.outcome) return
      controls.releaseMovement()
      walker = scoutWalker()
      if (flight.outcome !== 'obstruction') Object.assign(walker.player, flight.pilot)
      recovering = flight.outcome === 'obstruction'
      returning = !recovering
      if (returning) walker.player.heading = returnHeading(walker.player)
      if (!overview) initializeCamera = true
    }

    function walk(camera: ArcRotateCamera) {
      const forward = controls.forward(), sideways = controls.steer()
      const x = -forward * Math.cos(camera.alpha) - sideways * Math.sin(camera.alpha)
      const z = -forward * Math.sin(camera.alpha) + sideways * Math.cos(camera.alpha)
      const previous = { ...walker.player }
      stepPlayerOnTerrain(walker, [], { x, z, spray: false, careful: false, sprint: false }, false, ridgeStep, () => -Infinity)
      const traveled = distance(previous, walker.player)
      walkCycle += traveled / ridgeScoutMotion.walk.cycleMetres
      walkStride = Math.min(ridgeScoutMotion.walk.strideLimit, traveled / ridgeStep * ridgeScoutMotion.walk.strideGain)
    }

    function advance(camera: ArcRotateCamera, delta: number) {
      accumulator += Math.min(delta, maxFrameSeconds)
      while (accumulator >= ridgeStep) {
        if (flight && !flight.outcome) fly()
        else walk(camera)
        accumulator -= ridgeStep
      }
    }

    function status(airborne: boolean, atLaunch: boolean, toWillow: boolean) {
      const stats = flight ? ' · ' + flight.elapsed.toFixed(1) + ' s · ' + flight.clearance.toFixed(clearanceDisplayDecimals) + ' m minimum prop/wing clearance' : ''
      if (airborne && flight) {
        const { pilot } = flight
        const target = toWillow ? mirrorPoolWillow : ridgeMeadow
        const heading = Math.atan2(target.x - pilot.x, target.z - pilot.z) - pilot.heading
        const angle = Math.atan2(Math.sin(heading), Math.cos(heading))
        const bearing = Math.abs(angle) < aheadBearingRadians ? 'ahead' : angle > 0 ? 'right' : 'left'
        const lift = flight.climbing ? 'Updraft lifting the wing. ' : ''
        return lift + (toWillow ? 'Willow ' : 'Meadow ') + bearing + ' · ' + Math.round(distance(pilot, target)) + ' m' + stats
          + '\nA / D bank · W nose down · S pull up · C change view'
      }
      if (atLaunch) return (recovering ? 'Clearance lost. Pilot recovered at the ridge.' + stats + '\nWing returned to Windstone Ridge.\n' : '')
        + 'Follow the blue orbs in the air.\nE launch · WASD walk · Drag to orbit · C change view'
      if (returning && flight) {
        const result = flight.outcome === 'field' ? 'Landed in the meadow' : 'Landed outside the meadow'
        return result + stats + '\nWing returned to Windstone Ridge.\nHead uphill to the windsock · '
          + Math.round(distance(walker.player, ridgeLaunch)) + ' m to the ridge · WASD walk'
      }
      return 'WASD scout on foot · Return to the launch by the windsock · R reset'
    }

    return ({ delta }, { crew: fitting, route }) => {
      const camera = meshes.scene.activeCamera
      if (!(camera instanceof ArcRotateCamera)) return
      if (controls.consume('KeyR')) {
        controls.releaseMovement()
        flight = undefined
        walker = scoutWalker()
        overview = returning = recovering = false
        initializeCamera = true
      }
      if (controls.consume('KeyC')) {
        overview = !overview
        initializeCamera = true
      }
      if (controls.consume('KeyE') && atLaunch() && (!flight || flight.outcome)) begin()

      advance(camera, delta)
      windTime += delta
      drawUpdraft(windTime)
      const flying = flight?.outcome ? undefined : flight
      const toWillow = route === 'survey'
      const flightPilot = flying?.pilot
      showRoute(toWillow, flightPilot)
      if (returning && atLaunch()) {
        returning = false
        walker.player.heading = ridgeHeading
        if (!overview) initializeCamera = true
      }
      const pilot = flightPilot ?? walker.player
      crew.root.position.set(pilot.x, pilot.y + ridgeScoutMotion.pose.groundLift, pilot.z)
      crew.root.rotation.set(flying?.pitch ?? 0, pilot.heading, flying?.bank ?? 0)
      crew.setAppearance(undefined, { base: Number(fitting) })
      wing.parent = flying ? crew.root : rack
      wing.position.y = flying ? 0 : ridgeScoutMotion.pose.rackedWingY
      const blend = Math.min(1, delta * ridgeScoutMotion.pose.blendRate)
      if (flying) poseHangGliderPilot(crew, blend)
      else poseCrew(crew, walkCycle, walkStride, !walker.player.grounded, undefined, 0, blend)
      if (initializeCamera) {
        const heading = returning ? returnHeading(walker.player) : ridgeHeading - ridgeScoutViews.follow.launchHeadingOffset
        aimScoutCamera(camera, heading, overview, returning)
        initializeCamera = false
      }
      updateScoutCamera(camera, crew.root, overview)
      observe(status(Boolean(flying), atLaunch(), toWillow))
    }
  },
}
