import { Engine } from '@babylonjs/core/Engines/engine'
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Viewport } from '@babylonjs/core/Maths/math.viewport'
import { Scene } from '@babylonjs/core/scene'
import { createAtmosphere, sceneWeather } from './island-atmosphere'
import { landscapeLink } from './playtest-link'
import { inSkiff } from './actions'
import { routeContactHeight } from './route-contact'
import { createFarmOrderView } from './farm-order-view'
import { market } from './farm'
import { createExtinguisherSpray } from './extinguisher-spray'
import { createLookoutIncident } from './lookout-recovery-art'
import { moveTo, walkGait } from './island-render-pose'
import { createIslandCamera } from './island-camera'
import { aimFishingRod, createFishingGear, updateFishingLine } from './fishing-line-view'
import { createIslandAudio, type CrateImpactNotice } from './audio/island-audio'
import { carrierShift, countFootfalls, groundTravel } from './audio/gait'
import type { SoundSettings } from './audio/mix'
import { createPlaceLabels } from './place-labels'
import type { LookSettings } from './look-options-ui'
import { createRidgeAviationView, ridgeCameraMode } from './ridge-aviation-view'
import { createDeliveryWayfindingView } from './delivery-wayfinding-view'
import { createMaterialsWorkView } from './assets/materials-work'
import { createCrew, createFarmTools, playerColors, poseCrew, poseSkiffCrew, poseSwimming, skiffCrewSeats, swimmingHeight } from './assets/crew'
import { createFlatbed, poseFlatbed } from './assets/flatbed'
import { createSupply } from './assets/props'
import { poseFloating } from './assets/waterfront'
import { createIslandLighting, createMeshFactory } from './island-meshes'
import { createIslandWorld } from './island-world'
import { activeJob, deliveryDrop, deliveryRadius, jobBoard } from './jobs'
import { createObjectiveMarker } from './objective-marker'
import type { Snapshot } from './protocol'
import { groundHeight, walkingHeight, waterDepth, waterLevel } from './terrain'
import { flatbedGroundDrive } from './vehicles/flatbed'
import { createStarterActionEffects } from './starter-action-effects'
import { createStarterPlaces } from './starter-place-effects'
import { nightLighting } from './weather'
import { createShaderReview } from './shader-review'
import { dryMarketRainAge, marketRunoffAt, marketRunoffPreview } from './market-runoff'
import { harbor, itemStarts, lookout, town } from './world'

const sun = '#ffd56b'

function swimmers(snapshot?: Snapshot) {
  return snapshot?.players.filter((player) => player.connected && !player.seat &&
    (player.swimming || (!player.truckSurface && player.y <= waterLevel + .08 && waterDepth(player) > .04))) ?? []
}

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
  const { juniper, updateEnvironment, homeChests, showFarm, boat, buoys, ferns, garden, residents } = createIslandWorld(meshes, { liveParticles: true })
  const showMaterialsWork = createMaterialsWorkView(meshes)

  const pickupPad = createObjectiveMarker(meshes, harbor, 8, sun)
  const dropPad = createObjectiveMarker(meshes, town, deliveryRadius * 2, '#67ecdc')
  const marketPad = createObjectiveMarker(meshes, market, 4.5, '#67ecdc')
  const boardPad = createObjectiveMarker(meshes, jobBoard, 5.6, sun)
  const firePad = createObjectiveMarker(meshes, lookout, 9.7, '#ff956b')
  const equipmentPad = createObjectiveMarker(meshes, { x: 21, z: 22 }, 5.3, '#ffae77')

  const flatbed = createFlatbed(meshes)
  const truck = flatbed.root
  truck.setEnabled(false)
  let wheelRotation = 0

  const crew = playerColors.map((_, id) => {
    const character = createCrew(meshes, id)
    character.root.setEnabled(false)
    return character
  })
  const cycles = crew.map(() => 0)
  const truckStep = { x: 0, z: 0 }
  const aviation = createRidgeAviationView(meshes, crew)
  const showDeliveryRoute = createDeliveryWayfindingView(meshes)
  const showFarmOrder = createFarmOrderView(meshes, crew.map(character => character.root))
  const farmTools = crew.map((character) => createFarmTools(meshes, character))
  const skiffGear = createFishingGear(scene, meshes, crew)
  // One mesh per host item, built from the same table the host uses.
  const items = itemStarts.map(({ kind }) => {
    const node = createSupply(meshes, kind)
    const cargoTag = kind === 'crate' ? meshes.box(0, 0.26, -0.456, 0.35, 0.12, 0.024, '#fff0bd', node, false) : undefined
    cargoTag?.setEnabled(false)
    node.setEnabled(false)
    return { node, cargoTag }
  })

  const extinguisherIds = itemStarts.flatMap(({ kind }, id) => kind === 'extinguisher' ? [id] : [])
  const sprays = extinguisherIds.map((_, index) => createExtinguisherSpray(scene, 9011 + index))
  const showLookout = createLookoutIncident(meshes)
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
    const point = Vector3.Project(new Vector3(x, y, z), Matrix.IdentityReadOnly,
      scene.getTransformMatrix(), viewport)
    element.style.left = `${point.x / viewport.width * 100}%`
    element.style.top = `${point.y / viewport.height * 100}%`
    element.style.visibility = point.z >= 0 && point.z <= 1 ? 'visible' : 'hidden'
  }


  let last: Snapshot | undefined
  let tip: { element: HTMLElement; at: { x: number; y: number; z: number } } | undefined
  let viewer = -1
  let follow = false
  let time = 0, ambientTime = 0
  function updateScenery(state: Snapshot, factor: number, delta: number) {
    showFarm(state.farm)
    residents.update(state, factor, delta, time)
    garden.update(state, factor)
    showMaterialsWork(state)
    for (const [i, { hinge }] of homeChests.entries()) {
      const withdrawn = state.players.find((player) => player.id === i)?.inventory.length
      hinge.rotation.x += ((withdrawn ? 0.9 : 0) - hinge.rotation.x) * factor
    }
    const pose = state.truck
    const snap = !truck.isEnabled() || Math.hypot(truck.position.x - pose.x, truck.position.z - pose.z) > 14
    const blend = snap ? 1 : factor
    const { x, z } = truck.position
    moveTo(truck, pose, pose.y, factor)
    Object.assign(truckStep, { x: truck.position.x - x, z: truck.position.z - z })
    truck.rotation.x += (pose.pitch - truck.rotation.x) * blend
    truck.rotation.z += (pose.roll - truck.rotation.z) * blend
    if (!snap) wheelRotation += pose.speed * delta / flatbedGroundDrive.wheels.radius
    poseFlatbed(flatbed, wheelRotation, pose.steering, pose.suspension, blend)
  }

  function updateCharacters(state: Snapshot, factor: number, delta: number) {
    for (const [id, character] of crew.entries()) {
      const node = character.root
      const player = state.players.find((entry) => entry.id === id)
      const { gear, bobber, line } = skiffGear[id]
      const boating = player?.connected && inSkiff(player.seat)
      bobber.isVisible = line.isVisible = Boolean(player?.connected && player.casting)
      if (!player?.connected || (player.seat && !boating)) {
        node.setEnabled(false)
        continue
      }
      const seatIndex = player.seat === 'port' ? 0 : 1
      const rod = player.equipped === 'fishing-rod' && !player.rowing
      const gripIndex = boating ? seatIndex : rod ? 0 : -1
      gear.forEach((tool, index) => {
        tool.grip.setEnabled(gripIndex === index)
        tool.rod.setEnabled(rod)
        tool.paddle.setEnabled(!rod)
      })
      const { hoe, can } = farmTools[id]
      hoe.setEnabled(!boating && player.equipped === 'hoe')
      can.setEnabled(!boating && player.equipped === 'watering-can')
      const wasVisible = node.isEnabled()
      character.setAppearance(player.appearance, { base: player.appearanceBase })
      character.blink(time)
      if (aviation.pose(state, player, character, factor)) continue
      if (boating) {
        const side = seatIndex === 0 ? -1 : 1
        Vector3.TransformCoordinatesToRef(skiffCrewSeats[seatIndex], boat.computeWorldMatrix(true), node.position)
        node.rotation.copyFrom(boat.rotation)
        node.setEnabled(true)
        const stroke = player.rowing ? Math.sin(time * 5.2 + id * 2.2) : 0
        poseSkiffCrew(character, stroke, side, rod, wasVisible ? factor : 1)
        if (!rod) gear[seatIndex].alignPaddle()
      } else {
        node.rotation.x = 0
        node.rotation.z = 0
        const pushing = state.farmWork.barrow?.handler === id
        const { x, z } = node.position
        moveTo(node, player, player.swimming ? swimmingHeight(time + id) : player.y + 0.05, factor)
        if (player.grounded && !player.onBed && !player.swimming) {
          const floor = pushing ? routeContactHeight(node.position) : walkingHeight(node.position)
          node.position.y = Math.max(node.position.y, floor + .05)
        }
        // Riding the truck bed moves the crew without walking.
        const step = wasVisible ? groundTravel({ x, z }, node.position, carrierShift(player, truckStep)) : 0
        const held = state.items.find((item) => item.holder === id)
        const gait = walkGait(step, delta, pushing)
        const footfalls = countFootfalls(cycles[id], cycles[id] += gait.cycles)
        audio.footsteps(footfalls, player, node.position, step / Math.max(delta, .001), id === viewer)
        const winding = player.charge?.kind === 'throw' ? player.charge.power : 0
        if (player.swimming) poseSwimming(character, time + id, Math.min(1, step / Math.max(.001, delta * 3.8)), factor)
        else poseCrew(character, cycles[id], gait.stride, !player.grounded, held?.kind ?? (pushing ? 'barrow' : player.equipped ? 'tool' : undefined),
          Number(Boolean(player.reaching || held?.spraying || player.casting)),
          wasVisible ? 1 - Math.exp(-delta * 16) : 1, winding, player.throwing, player.rightHandRaised)
      }
      if (rod) aimFishingRod(player, skiffGear[id], gripIndex)
      updateFishingLine(player, skiffGear[id], gripIndex, time)

    }
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
      const spray = sprays[extinguisherIds.indexOf(item.id)]
      const locked = item.kind === 'extinguisher' && state.mission !== 'fire'
      if (item.delivered || holder?.seat || locked) {
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
      } else {
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
      const spread = !close && actor.seat && last?.players.every((player) => player.seat &&
        inSkiff(player.seat) === boating) ? (id - 0.5) * 5 : 0
      locate(tag, viewport, position.x + spread, position.y + (boating ? 2.35 : actor.seat ? 3.9 : 2.8), position.z)
    }
  }

  engine.runRenderLoop(() => {
    const delta = Math.min(engine.getDeltaTime() / 1000, 0.06)
    const factor = 1 - Math.exp(-delta * 22)
    time += delta
    if (last?.skiff) moveTo(boat, last.skiff, waterLevel, factor)
    poseFloating(boat, time, 0.5, 0.048)
    buoys.forEach((buoy, index) => poseFloating(buoy, time, index * 1.67))
    showDeliveryRoute(last)
    if (last) {
      updateScenery(last, factor, delta)
      updateCharacters(last, factor, delta)
      updateEquipment(last, factor)
      const drop = deliveryDrop(last)
      pickupPad.setEnabled(Boolean(drop))
      dropPad.setEnabled(Boolean(drop))
      if (drop) dropPad.position.set(drop.x, groundHeight(drop) + 0.095, drop.z)
      marketPad.setEnabled(activeJob(last)?.kind === 'market')
      boardPad.setEnabled(last.mission === 'complete' && !last.jobs.active)
      firePad.setEnabled(last.mission === 'fire')
      equipmentPad.setEnabled(last.mission === 'fire')
      showLookout(last, time)
    } else {
      marketPad.setEnabled(false)
      boardPad.setEnabled(false)
      firePad.setEnabled(false)
      equipmentPad.setEnabled(false)
    }
    showFarmOrder(last, factor)
    aviation.update(last, time)
    const local = last?.players.find((player) => player.id === viewer && player.connected)
    const subject = follow && local ? (inSkiff(local.seat) ? boat : local.seat ? truck : crew[local.id].root) : undefined
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight())
    const normalCamera = islandCamera.update(review?.active() ? undefined : subject, Boolean(local?.seat), aspect, delta, ridgeCameraMode(last, local))
    const field = review?.view(time)
    const camera = field?.camera ?? normalCamera
    const close = Boolean(field || subject)
    const climate = sceneWeather(field?.weather, last?.weather)
    const { weather } = climate
    const clock = last?.islandTime ?? time
    const timeError = clock - ambientTime
    ambientTime = Math.abs(timeError) > .25 ? clock : ambientTime + delta * (1 + timeError * 4)
    const crewInWater = swimmers(last)
    const threats = last ? [...crewInWater, last.skiff] : crewInWater
    const frame = { time: field?.time ?? ambientTime, delta, ...climate, camera: camera.position, threats, seek: Boolean(field) }
    if (last?.juniper) juniper(last.juniper, time, factor)
    const runoff = field ? marketRunoffPreview(weather.rain, dryMarketRainAge) : marketRunoffAt(clock)
    const livePlayer = !field && subject ? local : undefined
    placesFx(frame, !livePlayer, runoff)
    actionFx.draw(time, camera.position, livePlayer, last)
    const strength = nightLighting(weather.hour)
    flatbed.setLights(truck.isEnabled() ? strength : 0, last?.truck.braking)
    const light = atmosphere.update(field?.time ?? time, weather, camera.position, close)
    audio.frame(camera.position, camera.getDirection(Vector3.Forward()), weather.rain, delta)
    updateEnvironment(frame, light, close, runoff, {
      driftwood: last?.driftwood, quality: review?.quality(), tideTime: field ? field.tideTime : clock,
      actors: { snapshot: last, waterCrew: crewInWater, inspection: field?.inspection,
        skiffPose: { x: boat.position.x, z: boat.position.z, heading: boat.rotation.y } },
    })
    if (review) review.render()
    else scene.render()
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    labels.update(last, local, close, (element, x, y, z) => locate(element, viewport, x, y, z))
    updateCrewTags(close, viewport)
    if (tip) locate(tip.element, viewport, tip.at.x, tip.at.y + .45, tip.at.z)
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
      return landscapeLink(location.href, { focus: [camera.target[0], camera.target[2]], camera, ...last.weather,
        time: ambientTime, grid: false, wireframe: false })
    },
    isReviewing: () => review?.active() ?? false,
    walkInput: (x: number, z: number) => islandCamera.walkInput(x, z),
    aimHeading: islandCamera.aimHeading,
    aimRay: () => islandCamera.aimRay(),
    pinTip(element: HTMLElement, at?: { x: number; y: number; z: number }) { tip = at && { element, at } },
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
