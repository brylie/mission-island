import { Engine } from '@babylonjs/core/Engines/engine'
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { CreateLines } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import type { Viewport } from '@babylonjs/core/Maths/math.viewport'
import { Scene } from '@babylonjs/core/scene'
import { createAtmosphere } from './island-atmosphere'
import { landscapeLink } from './playtest-link'
import { inSkiff } from './actions'
import { castTravelSeconds } from './charged-actions'
import { farm, market } from './farm'
import { createExtinguisherSpray } from './extinguisher-spray'
import { createLookoutFire } from './fire-effect'
import { fisherAt, fisherName } from './harbor-fisher'
import { moveTo } from './island-render-pose'
import { fishingFloatDip } from './starter-effect-cues'
import { createIslandCamera } from './island-camera'
import { createCrew, createFarmTools, createSkiffGear, playerColors, poseCrew, poseSkiffCrew, poseSwimming, skiffCrewSeats, swimmingHeight } from './assets/crew'
import { createFlatbed, poseFlatbed } from './assets/flatbed'
import { createSupply } from './assets/props'
import { poseFloating } from './assets/waterfront'
import { createIslandLighting, createMeshFactory } from './island-meshes'
import { createIslandWorld } from './island-world'
import { activeJob, deliveryDrop, deliveryRadius, jobBoard } from './jobs'
import { createObjectiveMarker } from './objective-marker'
import { northernRegions, starterDiscoveries } from './scenery'
import type { Player, Snapshot } from './protocol'
import { groundHeight, walkingHeight, waterDepth, waterLevel } from './terrain'
import { flatbedGroundDrive } from './vehicles/flatbed'
import { createStarterActionEffects } from './starter-action-effects'
import { createStarterPlaces } from './starter-place-effects'
import { nightLighting } from './weather'
import { marketRunoffAt } from './market-runoff'
import {
  beach, cottageDoor, crateStarts, crewHomes, distance, extinguisherStarts, ferryTerminal, forest, harbor, lookout, town,
} from './world'

const sun = '#ffd56b'

export function createRenderer(canvas: HTMLCanvasElement, markers: HTMLElement) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true })
  const scene = new Scene(engine)
  const islandCamera = createIslandCamera(scene, canvas)

  const lighting = createIslandLighting(scene)
  const { shadows } = lighting
  const atmosphere = createAtmosphere(scene, lighting.sky, lighting.sunlight, shadows)
  const meshes = createMeshFactory(scene, shadows)
  const { juniper, water, homeChests, showFarm, boat, buoys, northernScenery, wildlife, phenomena, lights, marketShower, ferns } = createIslandWorld(meshes, { liveParticles: true })

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
  const fisher = createCrew(meshes, playerColors.length)
  fisher.setAppearance({ uniform: 'angler', skin: 'warm' }, '#b9664a')
  fisher.root.setEnabled(false)
  let fisherCycle = 0
  const farmTools = crew.map((character) => createFarmTools(meshes, character))
  const skiffGear = crew.map((character) => {
    const gear = createSkiffGear(meshes, character)
    const bobber = meshes.sphere(0, 0, 0, 0.135, 0.135, 0.135, '#ff845e', undefined, false)
    const linePoints = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()]
    const line = CreateLines('Fishing line', { points: linePoints, updatable: true }, scene)
    line.color = Color3.FromHexString('#eee7c7')
    line.isPickable = false
    line.isVisible = false
    bobber.isVisible = false
    return { gear, bobber, linePoints, line, tip: new Vector3(0, -1.425, 0) }
  })
  const items = [...crateStarts, ...extinguisherStarts].map((_, id) => {
    const isCrate = id < crateStarts.length
    const node = createSupply(meshes, isCrate ? 'crate' : 'extinguisher')
    const cargoTag = isCrate ? meshes.box(0, 0.26, -0.456, 0.35, 0.12, 0.024, '#fff0bd', node, false) : undefined
    cargoTag?.setEnabled(false)
    node.setEnabled(false)
    return { node, cargoTag }
  })

  const sprays = extinguisherStarts.map((_, index) => createExtinguisherSpray(scene, 9011 + index))
  const fire = createLookoutFire(scene, lookout.x, lookout.z)
  const placesFx = createStarterPlaces(meshes)
  const actionFx = createStarterActionEffects(scene, { boat, crew, farmTools, paddles: skiffGear.map(({ gear }) => gear), ferns })

  const landmarks = [
    { point: { x: harbor.x + 1.3, z: harbor.z - 5 }, title: 'Harbor Depot', kind: 'harbor', height: 4 },
    { point: town, title: 'Seabrook', kind: 'town', height: 2.6 },
    { point: forest, title: 'Pinewoods', kind: 'forest', height: 7 },
    { point: beach, title: 'Driftwood Beach', kind: 'beach', height: 2.2 },
    { point: lookout, title: 'Forest Lookout', kind: 'lookout', height: 4.3 },
    { point: farm, title: 'Island Farm', kind: 'farm', height: 1.32 },
    { point: market, title: 'Seabrook Market', kind: 'market', height: 3.32 },
    { point: jobBoard, title: 'Harbor job board', kind: 'board', height: 2.35 },
    { point: { x: 21, z: 22 }, title: 'Fire Supplies', kind: 'equipment', height: 2.4 },
    { point: ferryTerminal, title: 'Ferry terminal · Closed', kind: 'ferry', height: 2.1 },
    ...crewHomes.flatMap((home, owner) => [
      { point: cottageDoor(home), title: `Your home · ${home.name}`, kind: 'home', height: 2.5, owner },
      { point: home.chest, title: 'Your tool chest', kind: 'chest', height: 0.95, owner },
    ]),
  ]
  const places = [
    ...landmarks.map((place) => ({ ...place, discovery: '', mapOnly: false })),
    ...starterDiscoveries.map((region) => ({ point: region.site, title: region.name, kind: 'discovery',
      height: 2.8, discovery: region.id, mapOnly: false })),
    ...northernRegions.map((region) => ({ point: region.at, title: region.biome, kind: 'biome',
      height: 5, discovery: '', mapOnly: true })),
  ].map((place) => {
    const label = document.createElement('span')
    label.className = `place place--${place.kind}`
    label.textContent = place.title
    markers.append(label)
    return { ...place, label }
  })
  const tags = playerColors.map((_, id) => {
    const tag = document.createElement('span')
    tag.className = `crew-tag crew-tag--${id}`
    markers.append(tag)
    return tag
  })
  const fisherTag = document.createElement('span')
  fisherTag.className = 'place place--resident'
  fisherTag.textContent = `${fisherName} · Fisher`
  markers.append(fisherTag)

  function locate(element: HTMLElement, viewport: Viewport, x: number, y: number, z: number) {
    const point = Vector3.Project(new Vector3(x, y, z), Matrix.IdentityReadOnly,
      scene.getTransformMatrix(), viewport)
    element.style.left = `${point.x / viewport.width * 100}%`
    element.style.top = `${point.y / viewport.height * 100}%`
    element.style.visibility = point.z >= 0 && point.z <= 1 ? 'visible' : 'hidden'
  }


  let last: Snapshot | undefined
  let viewer = -1
  let follow = false
  let time = 0, ambientTime = 0
  function updateScenery(state: Snapshot, factor: number, delta: number) {
    showFarm(state.farm)
    const resident = fisherAt(state.weather.hour)
    moveTo(fisher.root, resident, walkingHeight(resident), factor)
    if (resident.walking) fisherCycle += delta * 1.8
    poseCrew(fisher, fisherCycle, resident.walking ? 0.65 : 0, false, undefined, 0, factor)
    fisher.blink(time)
    for (const [i, { hinge }] of homeChests.entries()) {
      const withdrawn = state.players.find((player) => player.id === i)?.inventory.length
      hinge.rotation.x += ((withdrawn ? 0.9 : 0) - hinge.rotation.x) * factor
    }
    const pose = state.truck
    const snap = !truck.isEnabled() || Math.hypot(truck.position.x - pose.x, truck.position.z - pose.z) > 14
    const blend = snap ? 1 : factor
    moveTo(truck, pose, pose.y, factor)
    truck.rotation.x += (pose.pitch - truck.rotation.x) * blend
    truck.rotation.z += (pose.roll - truck.rotation.z) * blend
    if (!snap) wheelRotation += pose.speed * delta / flatbedGroundDrive.wheels.radius
    poseFlatbed(flatbed, wheelRotation, pose.steering, pose.suspension, blend)
  }

  function updateFishingLine(player: Player, kit: typeof skiffGear[number], gripIndex: number) {
    const { gear, bobber, line, linePoints, tip } = kit
    if (player.casting && gripIndex >= 0) {
      const { bobber: target, elapsed } = player.casting
      Vector3.TransformCoordinatesToRef(tip, gear[gripIndex].rod.computeWorldMatrix(true), linePoints[0])
      const flight = Math.min(1, elapsed / castTravelSeconds)
      const progress = player.casting.fight?.progress ?? 0
      const pulling = player.casting.fight?.pulling
      linePoints[2].set(target.x + (player.x - target.x) * progress * 0.88,
        waterLevel + 0.025 - fishingFloatDip(player.casting) + Math.sin(time * (pulling ? 13 : 5)) * (pulling ? 0.09 : 0.025),
        target.z + (player.z - target.z) * progress * 0.88)
      Vector3.LerpToRef(linePoints[0], linePoints[2], flight, bobber.position)
      bobber.position.y += Math.sin(flight * Math.PI) * 1.25
      Vector3.LerpToRef(linePoints[0], bobber.position, 0.55, linePoints[1])
      linePoints[1].y -= 0.13 * flight
      linePoints[2].copyFrom(bobber.position)
      CreateLines('Fishing line', { points: linePoints, instance: line })
    }
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
      character.setAppearance(player.appearance)
      character.blink(time)
      if (boating) {
        const side = seatIndex === 0 ? -1 : 1
        Vector3.TransformCoordinatesToRef(skiffCrewSeats[seatIndex], boat.computeWorldMatrix(true), node.position)
        node.rotation.copyFrom(boat.rotation)
        node.setEnabled(true)
        const stroke = player.rowing ? Math.sin(time * 5.2 + id * 2.2) : 0
        poseSkiffCrew(character, stroke, side, rod, wasVisible ? factor : 1)
      } else {
        node.rotation.x = 0
        node.rotation.z = 0
        const { x, z } = node.position
        moveTo(node, player, player.swimming ? swimmingHeight(time + id) : player.y + 0.05, factor)
        if (player.grounded && !player.onBed && !player.swimming) {
          node.position.y = Math.max(node.position.y, walkingHeight(node.position) + 0.05)
        }
        const traveled = Math.hypot(node.position.x - x, node.position.z - z)
        const step = wasVisible && traveled < 2 ? traveled : 0
        const held = state.items.find((item) => item.holder === id)
        cycles[id] += step / 4.8
        const stride = delta > 0 ? Math.min(0.92, step / delta * 0.072) : 0
        const winding = player.charge?.kind === 'throw' ? player.charge.power : 0
        if (player.swimming) poseSwimming(character, time + id, Math.min(1, step / Math.max(.001, delta * 3.8)), factor)
        else poseCrew(character, cycles[id], stride, !player.grounded, held?.kind ?? (player.equipped ? 'tool' : undefined),
          Number(Boolean(player.reaching || held?.spraying || player.casting)),
          wasVisible ? 1 - Math.exp(-delta * 16) : 1, winding, player.throwing, player.rightHandRaised)
      }
      if (rod && gripIndex >= 0) {
        const { grip, rod } = gear[gripIndex]
        grip.computeWorldMatrix(true)
        const lean = player.casting?.fight?.pulling ? 0.21 : 0.07
        rod.rotationQuaternion = Quaternion.Inverse(grip.absoluteRotationQuaternion)
          .multiply(Quaternion.RotationYawPitchRoll(player.heading, lean, Math.PI))
      }
      updateFishingLine(player, skiffGear[id], gripIndex)

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
      const spray = sprays[item.id - crateStarts.length]
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

  function updatePlaceLabels(local: Player | undefined, close: boolean, viewport: Viewport) {
    const job = last && activeJob(last)
    const drop = last && deliveryDrop(last)
    for (const place of places) {
      const range = close && local ? distance(place.point, local) : 0
      const opacity = Math.min(1, Math.max(0, (80 - range) / 38))
      place.label.hidden = opacity === 0 || (place.mapOnly && close) ||
        ('owner' in place && (place.owner !== local?.id || (place.kind === 'chest' && (!close || range > 12)))) ||
        (place.kind === 'ferry' && close && range > 38) ||
        Boolean(place.discovery && !local?.discoveries?.includes(place.discovery)) ||
        (place.kind === 'equipment' && last?.mission !== 'fire') || (place.kind === 'board' && last?.mission !== 'complete')
      place.label.style.opacity = String(opacity)
      place.label.classList.toggle('place--active',
        Boolean(drop && (place.kind === 'harbor' || distance(place.point, drop) < 6)) ||
        (job?.kind === 'market' && place.kind === 'market') ||
        (last?.mission === 'complete' && !job && place.kind === 'board') ||
        (last?.mission === 'fire' && (place.kind === 'lookout' || place.kind === 'equipment')))
      locate(place.label, viewport, place.point.x, groundHeight(place.point) + place.height, place.point.z)
    }
    const resident = fisher.root.position
    fisherTag.hidden = !local || (close && distance(resident, local) > 18)
    if (!fisherTag.hidden) locate(fisherTag, viewport, resident.x, resident.y + 2.1, resident.z)
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
      fire.pose(time, last.mission === 'fire' ? last.fire : 0)
    } else {
      marketPad.setEnabled(false)
      boardPad.setEnabled(false)
      firePad.setEnabled(false)
      equipmentPad.setEnabled(false)
    }
    const local = last?.players.find((player) => player.id === viewer && player.connected)
    const subject = follow && local ? (inSkiff(local.seat) ? boat : local.seat ? truck : crew[local.id].root) : undefined
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight())
    const camera = islandCamera.update(subject, Boolean(local?.seat), aspect, delta)
    northernScenery.update(camera.position, Boolean(subject))
    const weather = last?.weather ?? { hour: 6, rain: 0 }
    const clock = last?.islandTime ?? time
    const timeError = clock - ambientTime
    ambientTime = Math.abs(timeError) > .25 ? clock : ambientTime + delta * (1 + timeError * 4)
    const crewInWater = last?.players.filter((player) => player.connected && !player.seat &&
      (player.swimming || (!player.truckSurface && player.y <= waterLevel + .08 && waterDepth(player) > .04))) ?? []
    const threats = last ? [...crewInWater, last.skiff] : crewInWater
    const frame = { time: ambientTime, delta, weather, camera: camera.position, threats }
    if (last?.juniper) juniper(last.juniper, time, factor)
    wildlife(frame, last?.driftwood)
    phenomena(frame)
    const runoff = marketRunoffAt(clock)
    marketShower(ambientTime, camera.position, runoff)
    placesFx(frame, !subject, runoff)
    actionFx.draw(time, camera.position, subject ? local : undefined, last)
    const strength = nightLighting(weather.hour)
    flatbed.setLights(truck.isEnabled() ? strength : 0, last?.truck.braking)
    lights(camera.position, strength)
    const light = atmosphere.update(time, weather, camera.position, Boolean(subject))
    water.pose(time, light, weather.rain)
    scene.render()
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    updatePlaceLabels(local, Boolean(subject), viewport)
    updateCrewTags(Boolean(subject), viewport)
  })
  const resize = new ResizeObserver(() => engine.resize())
  resize.observe(canvas)

  return {
    update(snapshot: Snapshot, id: number, trackPlayer: boolean) {
      actionFx.snapshot(last, snapshot)
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
    walkInput: (x: number, z: number) => islandCamera.walkInput(x, z),
    aimHeading: islandCamera.aimHeading,
    captureMouse: islandCamera.captureMouse,
    releaseMouse: islandCamera.releaseMouse,
    setMouseInversion: (horizontal: boolean, vertical: boolean) => islandCamera.setMouseInversion(horizontal, vertical),
    dispose() {
      islandCamera.dispose()
      resize.disconnect()
      engine.dispose()
      markers.replaceChildren()
    },
  }
}
