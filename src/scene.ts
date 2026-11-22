import type { Camera } from '@babylonjs/core/Cameras/camera'
import { Engine } from '@babylonjs/core/Engines/engine'
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Viewport } from '@babylonjs/core/Maths/math.viewport'
import { Scene } from '@babylonjs/core/scene'
import { createAtmosphere, sceneWeather } from './island-atmosphere'
import { landscapeLink } from './playtest-link'
import { inSkiff } from './actions'
import { createFarmOrderView } from './farm-order-view'
import { market } from './farm'
import { createExtinguisherSpray } from './extinguisher-spray'
import { createLookoutIncident } from './lookout-recovery-art'
import { createWildfireView } from './wildfire-view'
import { moveTo, waterActors } from './island-render-pose'
import { createCrewPresentation } from './crew-presentation'
import { createIslandCamera } from './island-camera'
import { createIslandAudio, type CrateImpactNotice } from './audio/island-audio'
import type { SoundSettings } from './audio/mix'
import { createPlaceLabels } from './place-labels'
import type { LookSettings } from './look-options-ui'
import { createRidgeAviationView, ridgeCameraMode } from './ridge-aviation-view'
import { createDeliveryWayfindingView } from './delivery-wayfinding-view'
import { createMaterialsWorkView } from './assets/materials-work'
import { createCrew, playerColors } from './assets/crew'
import { createFlatbed, poseFlatbed } from './assets/flatbed'
import { createSupply } from './assets/props'
import { cargoTag as cargoTagShape, objectiveMarkerLook, starterObjectiveDiameters } from './assets/geometry/starter-cues'
import { poseFloating } from './assets/waterfront'
import { createIslandLighting, createMeshFactory } from './island-meshes'
import { createIslandWorld } from './island-world'
import { activeJob, deliveryDrop, deliveryRadius, jobBoard } from './jobs'
import { createObjectiveMarker } from './objective-marker'
import type { Player, Snapshot } from './protocol'
import { groundHeight, waterLevel } from './terrain'
import { flatbedGroundDrive } from './vehicles/flatbed'
import { createStarterActionEffects } from './starter-action-effects'
import { createStarterPlaces } from './starter-place-effects'
import { nightLighting } from './weather'
import { createShaderReview } from './shader-review'
import { dryMarketRainAge, marketRunoffAt, marketRunoffPreview } from './market-runoff'
import { harbor, itemStarts, lookout, town } from './world'
import { extinguisherStock } from './worlds/starter/layout/places'
import * as rendering from './island-render-settings'

const sun = '#ffd56b'

export function createRenderer(canvas: HTMLCanvasElement, markers: HTMLElement) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true })
  const scene = new Scene(engine)
  const islandCamera = createIslandCamera(scene, canvas)
  const review = createShaderReview(scene, canvas, engine, islandCamera.releaseMouse)
  const audio = createIslandAudio()

  const lighting = createIslandLighting(scene)
  const { shadows } = lighting
  const atmosphere = createAtmosphere(scene, lighting.sky, lighting.sunlight, shadows)
  const meshes = createMeshFactory(scene, shadows)
  const { juniper, updateEnvironment, homeChests, showFarm, showHouseholds, boat, buoys, ferns, garden, residents, ferry } = createIslandWorld(meshes, { liveParticles: true })
  const showMaterialsWork = createMaterialsWorkView(meshes)

  const pickupPad = createObjectiveMarker(meshes, harbor, starterObjectiveDiameters.pickup, sun)
  const dropPad = createObjectiveMarker(meshes, town, deliveryRadius * rendering.radiusToDiameter, '#67ecdc')
  const marketPad = createObjectiveMarker(meshes, market, starterObjectiveDiameters.market, '#67ecdc')
  const boardPad = createObjectiveMarker(meshes, jobBoard, starterObjectiveDiameters.jobBoard, sun)
  const firePad = createObjectiveMarker(meshes, lookout, starterObjectiveDiameters.lookout, '#ff956b')
  const equipmentPad = createObjectiveMarker(meshes, extinguisherStock, starterObjectiveDiameters.supplies, '#ffae77')

  const flatbed = createFlatbed(meshes)
  const truck = flatbed.root
  truck.setEnabled(false)
  let wheelRotation = 0

  const crew = playerColors.map((_, id) => {
    const character = createCrew(meshes, id)
    character.root.setEnabled(false)
    return character
  })
  const truckStep = { x: 0, z: 0 }
  const aviation = createRidgeAviationView(meshes, crew)
  const showDeliveryRoute = createDeliveryWayfindingView(meshes)
  const showFarmOrder = createFarmOrderView(meshes, crew.map((character) => character.root))
  const { farmTools, skiffGear, update: updateCrew } = createCrewPresentation(meshes, crew, boat, (...args) => aviation.pose(...args), (...args) => audio.footsteps(...args))
  // One mesh per host item, built from the same table the host uses.
  const items = itemStarts.map(({ kind }) => {
    const node = createSupply(meshes, kind)
    const cargoTag = kind === 'crate' ? meshes.box(...cargoTagShape.box, cargoTagShape.color, node, false) : undefined
    cargoTag?.setEnabled(false)
    node.setEnabled(false)
    return { node, cargoTag }
  })

  const sprays = new Map(itemStarts.flatMap(({ kind }, id) => kind === 'extinguisher' ? [[id, createExtinguisherSpray(scene, rendering.spraySeed + id)] as const] : []))
  const showLookout = createLookoutIncident(meshes)
  const showWildfire = createWildfireView(meshes, scene)
  const placesFx = createStarterPlaces(meshes)
  const actionFx = createStarterActionEffects(scene, { boat, crew, farmTools, paddles: skiffGear.map(({ gear }) => gear), ferns })

  const tags = playerColors.map((_, id) => {
    const tag = document.createElement('span')
    tag.className = `crew-tag crew-tag--${id}`
    markers.append(tag)
    return tag
  })
  const labels = createPlaceLabels(markers, residents.labels)
  function locate(element: HTMLElement, viewport: Viewport, x: number, y: number, z: number) {
    const point = Vector3.Project(new Vector3(x, y, z), Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport)
    element.style.left = `${point.x / viewport.width * rendering.percentScale}%`
    element.style.top = `${point.y / viewport.height * rendering.percentScale}%`
    element.style.visibility = point.z >= 0 && point.z <= 1 ? 'visible' : 'hidden'
  }

  let last: Snapshot | undefined
  let tip: { element: HTMLElement, at: { x: number, y: number, z: number } } | undefined
  let viewer = -1
  let follow = false
  let time = 0, ambientTime = 0
  function updateScenery(state: Snapshot, factor: number, delta: number) {
    showFarm(state.farm)
    showHouseholds(state)
    residents.update(state, factor, delta, time)
    garden.update(state, factor)
    showMaterialsWork(state)
    ferry.update(state)
    for (const [i, { hinge }] of homeChests.entries()) {
      const withdrawn = state.players.find((player) => player.id === i)?.inventory.length
      hinge.rotation.x += ((withdrawn ? rendering.withdrawnHingeAngle : 0) - hinge.rotation.x) * factor
    }
    const pose = state.truck
    const snap = !truck.isEnabled() || Math.hypot(truck.position.x - pose.x, truck.position.z - pose.z) > rendering.truckSnapDistance
    const blend = snap ? 1 : factor
    const { x, z } = truck.position
    moveTo(truck, pose, pose.y, factor)
    Object.assign(truckStep, { x: truck.position.x - x, z: truck.position.z - z })
    truck.rotation.x += (pose.pitch - truck.rotation.x) * blend
    truck.rotation.z += (pose.roll - truck.rotation.z) * blend
    if (!snap) wheelRotation += pose.speed * delta / flatbedGroundDrive.wheels.radius
    poseFlatbed(flatbed, wheelRotation, pose.steering, pose.suspension, blend)
  }

  function updateEquipment(state: Snapshot, factor: number) {
    const job = activeJob(state)
    for (const item of state.items) {
      const { node, cargoTag } = items[item.id]
      if (cargoTag) {
        cargoTag.setEnabled(job?.kind === 'delivery')
        if (job?.kind === 'delivery') cargoTag.material = meshes.paint(job.color)
      }
      const holder = state.players.find((player) => player.id === item.holder)
      const spray = sprays.get(item.id)
      if (item.delivered || holder?.seat) {
        node.setEnabled(false)
        spray?.(time, node, false)
        continue
      }
      const smooth = node.isEnabled()
      moveTo(node, item, item.y, factor)
      if (item.rotation) {
        const { x, y, z, w } = item.rotation
        const target = new Quaternion(x, y, z, w)
        node.rotationQuaternion = smooth && node.rotationQuaternion
          ? Quaternion.Slerp(node.rotationQuaternion, target, factor)
          : target
      }
      else {
        node.rotationQuaternion = null
        node.rotation.y = item.heading
      }
      spray?.(time, node, item.spraying === true)
    }
  }

  function updateCrewTags(close: boolean, viewport: Viewport) {
    for (const [id, tag] of tags.entries()) {
      const actor = last?.players.find((player) => player.id === id)
      const visible = actor?.connected
      tag.hidden = !visible
      if (!visible) continue
      tag.textContent = actor.name || `Crew ${id + 1}`
      const boating = inSkiff(actor.seat)
      const position = boating || !actor.seat ? crew[id].root.position : truck.position
      const spread = !close && actor.seat && last?.players.every((player) => player.seat
        && inSkiff(player.seat) === boating)
        ? (id - rendering.skiffSeatMidpoint) * rendering.skiffLabelSpread
        : 0
      locate(tag, viewport, position.x + spread, position.y + (boating ? rendering.skiffLabelHeight : actor.seat ? rendering.truckLabelHeight : rendering.standingLabelHeight), position.z)
    }
  }

  function updateObjectives(state: Snapshot | undefined) {
    if (state) {
      const drop = deliveryDrop(state)
      pickupPad.setEnabled(Boolean(drop))
      dropPad.setEnabled(Boolean(drop))
      if (drop) dropPad.position.set(drop.x, groundHeight(drop) + objectiveMarkerLook.groundOffset, drop.z)
      marketPad.setEnabled(activeJob(state)?.kind === 'market')
      boardPad.setEnabled(state.mission === 'complete' && !state.jobs.active)
      firePad.setEnabled(state.mission === 'fire')
      equipmentPad.setEnabled(state.mission === 'fire')
      showLookout(state, time)
      showWildfire(state, time)
    }
    else {
      marketPad.setEnabled(false)
      boardPad.setEnabled(false)
      firePad.setEnabled(false)
      equipmentPad.setEnabled(false)
    }
  }

  interface EnvironmentView {
    camera: Camera
    close: boolean
    field: ReturnType<NonNullable<typeof review>['view']>
    livePlayer?: Player
  }

  function drawEnvironment(delta: number, factor: number, { camera, close, field, livePlayer }: EnvironmentView) {
    const climate = sceneWeather(field?.weather, last?.weather)
    const { weather } = climate
    const clock = last?.islandTime ?? time
    const timeError = clock - ambientTime
    ambientTime = Math.abs(timeError) > rendering.ambientClockSnapSeconds ? clock : ambientTime + delta * (1 + timeError * rendering.ambientClockCorrectionRate)
    const crewInWater = waterActors(last)
    const threats = last ? [...crewInWater, last.skiff] : crewInWater
    const frame = { time: field?.time ?? ambientTime, delta, ...climate, camera: camera.position, threats, seek: Boolean(field) }
    if (last?.juniper) juniper(last.juniper, time, factor)
    const runoff = field ? marketRunoffPreview(weather.rain, dryMarketRainAge) : marketRunoffAt(clock)
    placesFx(frame, !livePlayer, runoff)
    actionFx.draw(time, camera.position, livePlayer, last)
    const strength = nightLighting(weather.hour)
    flatbed.setLights(truck.isEnabled() ? strength : 0, last?.truck.braking)
    const light = atmosphere.update(field?.time ?? time, weather, camera.position, close)
    audio.frame(camera.position, camera.getDirection(Vector3.Forward()), weather.rain, delta)
    updateEnvironment(frame, light, close, runoff, {
      driftwood: last?.driftwood,
      quality: review?.quality(),
      tideTime: field ? field.tideTime : clock,
      actors: { snapshot: last, waterCrew: crewInWater, inspection: field?.inspection, skiffPose: { x: boat.position.x, z: boat.position.z, heading: boat.rotation.y } },
    })
  }

  engine.runRenderLoop(() => {
    const delta = Math.min(engine.getDeltaTime() / rendering.millisecondsPerSecond, rendering.maxFrameSeconds)
    const factor = 1 - Math.exp(-delta * rendering.worldPoseResponse)
    time += delta
    if (last?.skiff) moveTo(boat, last.skiff, waterLevel, factor)
    poseFloating(boat, time, rendering.skiffBobPhase, rendering.skiffBobHeight)
    buoys.forEach((buoy, index) => void poseFloating(buoy, time, index * rendering.buoyPhaseStep))
    showDeliveryRoute(last)
    if (last) {
      updateScenery(last, factor, delta)
      updateCrew(last, { time, factor, delta, viewer, truckStep })
      updateEquipment(last, factor)
    }
    updateObjectives(last)
    showFarmOrder(last, factor)
    aviation.update(last, time)
    const local = last?.players.find((player) => player.id === viewer && player.connected)
    const subject = follow && local ? (inSkiff(local.seat) ? boat : local.seat ? truck : crew[local.id].root) : undefined
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight())
    const normalCamera = islandCamera.update(review?.active() ? undefined : subject, Boolean(local?.seat), aspect, delta, ridgeCameraMode(last, local))
    const field = review?.view(time)
    const camera = field?.camera ?? normalCamera
    const close = Boolean(field || subject)
    drawEnvironment(delta, factor, { camera, close, field, livePlayer: !field && subject ? local : undefined })
    if (review) review.render()
    else scene.render()
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    labels.update(last, local, close, (element, x, y, z) => locate(element, viewport, x, y, z))
    updateCrewTags(close, viewport)
    if (tip) locate(tip.element, viewport, tip.at.x, tip.at.y + rendering.targetLabelRise, tip.at.z)
  })
  const resize = new ResizeObserver(() => engine.resize())
  resize.observe(canvas)

  return {
    update(snapshot: Snapshot, id: number, trackPlayer: boolean) {
      actionFx.snapshot(last, snapshot)
      audio.snapshot(snapshot)
      last = snapshot
      viewer = id
      follow = trackPlayer
    },
    playtestLink() {
      const camera = islandCamera.inspectionCamera()
      if (!camera || !last) return
      return landscapeLink(location.href, { focus: [camera.target[0], camera.target[2]], camera, ...last.weather, time: ambientTime, grid: false, wireframe: false })
    },
    isReviewing: () => review?.active() ?? false,
    walkInput: (x: number, z: number) => islandCamera.walkInput(x, z),
    aimHeading: islandCamera.aimHeading,
    aimRay: () => islandCamera.aimRay(),
    pinTip(element: HTMLElement, at?: { x: number, y: number, z: number }) { tip = at && { element, at } },
    captureMouse: () => { if (!review?.active()) islandCamera.captureMouse() },
    releaseMouse: islandCamera.releaseMouse,
    setLook: (settings: LookSettings) => islandCamera.setLook(settings),
    setSound: (settings: SoundSettings) => audio.setSound(settings),
    hearImpact: (notice: CrateImpactNotice) => audio.impact(notice),
    resetSound: () => audio.resetRun(),
    dispose() {
      audio.dispose()
      review?.dispose()
      islandCamera.dispose()
      resize.disconnect()
      engine.dispose()
      markers.replaceChildren()
    },
  }
}
