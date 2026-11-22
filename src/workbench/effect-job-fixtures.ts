import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { createFarmTools, poseCrew, wateringRoseOffset } from '../assets/crew'
import { createTimberSaw } from '../assets/effect-props'
import { ashStage, crateGritStage, ferrySparksStage, sawdustStage, wateringStage } from '../assets/geometry/workbench-effect-fixtures'
import { createSupply } from '../assets/props'
import { ashMotion, crateGritMotion, ferrySparksMotion, sawdustMotion, wateringMotion } from '../assets/recipes/workbench-effect-fixtures'
import { plotSurfaceOffset } from '../farm'
import { createFarm } from '../island-farm'
import type { MeshFactory } from '../island-meshes'
import { createLookoutAsh } from '../lookout-recovery-art'
import { lookoutSteamCue } from '../starter-effect-cues'
import { groundHeight } from '../terrain'
import { crateSize, lookout } from '../world'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

const halves = 2
const wateringRose = new Vector3(...wateringRoseOffset)

export function wateringFixture(meshes: MeshFactory): Fixture {
  const { crew: actor, plot } = wateringStage
  const { can: motion, armReach, splash } = wateringMotion
  const crew = crewAt(meshes, actor.x, actor.z, actor.id)
  const { can } = createFarmTools(meshes, crew)
  can.setEnabled(true)
  createFarm(meshes, [plot], () => 0)(['watered'])
  function pose(time: number) {
    poseCrew(crew, 0, 0, false, 'tool', armReach)
    can.rotation.x = motion.pitch + Math.sin(time * motion.pitchRate) * motion.pitchReach
    can.rotation.y = Math.sin(time * motion.yawRate) * motion.yawReach
  }
  return {
    sourceAt(time) {
      pose(time)
      const matrix = can.computeWorldMatrix(true)
      const { x, y, z } = Vector3.TransformCoordinates(wateringRose, matrix)
      const aim = Vector3.TransformNormal(Vector3.Forward(), matrix)
      return { x, y, z, yaw: Math.atan2(aim.x, aim.z), floor: plotSurfaceOffset }
    },
    accents: [{ id: 'garden-splashes', sourceAt: (time) => {
      if (time >= splash.start) return { x: splash.x + Math.sin((time - splash.phase) * splash.rate) * splash.spread, y: splash.y, z: splash.z }
    } }],
    pose,
  }
}

export function sawdustFixture(meshes: MeshFactory): Fixture {
  const saw = createTimberSaw(meshes)
  const { crew } = sawdustStage
  const { cut, floor } = sawdustMotion
  crewAt(meshes, crew.x, crew.z)
  const source = { ...saw.dustOffset, floor }
  const sourceAt = (time: number) => contactAge(time, ...cut) === undefined ? undefined : source
  return {
    sourceAt,
    accents: [{ id: 'mill-dust', sourceAt }],
    pose: saw.pose,
  }
}

export function crateGritFixture(meshes: MeshFactory): Fixture {
  const { crew: actor, crate: cratePlacement, pad } = crateGritStage
  const { contact, drop, landings } = crateGritMotion
  const crew = crewAt(meshes, actor.x, actor.z)
  crew.root.rotation.y = actor.heading
  poseCrew(crew, 0, 0, false, 'crate')
  const crate = createSupply(meshes, 'crate')
  crate.position.x = cratePlacement.x
  crate.position.z = cratePlacement.z
  meshes.box(0, pad.y, 0, ...pad.size, meshes.paintSurface('gravel', pad.color)).receiveShadows = true
  function sourceAt(time: number, index: number) {
    const landing = landings.find(({ time: start }) => time >= start && time < start + contact.duration)
    if (!landing) return
    const x = index % halves ? 1 : -1
    const z = index % contact.directions < halves ? 1 : -1
    return {
      x: crate.position.x + contact.xOffset * x,
      y: contact.y,
      z: crate.position.z + contact.zOffset * z,
      yaw: Math.atan2(x, z),
      speed: landing.speed,
      floor: contact.floor,
    }
  }
  return {
    sourceAt,
    accents: [{ id: 'crate-grains', sourceAt }],
    pose(time) {
      const landing = landings.find(({ time: start }) => time <= start + drop.reboundDuration)?.time
      const rest = crateSize / halves + drop.clearance
      const offset = landing === undefined
        ? 0
        : time < landing
          ? Math.min(drop.height, (landing - time) * drop.approachSpeed)
          : Math.sin((time - landing) / drop.reboundDuration * Math.PI) * drop.reboundHeight
      crate.position.y = rest + offset
    },
  }
}

export function ashFixture(meshes: MeshFactory): Fixture {
  const base = { ...lookout, y: groundHeight(lookout) }
  const { source } = lookoutSteamCue()
  const height = source.y - base.y
  createLookoutAsh(meshes, base)
  const { crew: actor, tool: toolPlacement } = ashStage
  const { embers, steam } = ashMotion
  const crew = crewAt(meshes, actor.x, actor.z, actor.id)
  poseCrew(crew, 0, 0, false, 'extinguisher', 1)
  const tool = createSupply(meshes, 'extinguisher')
  tool.position.set(0, toolPlacement.y, toolPlacement.z)
  return {
    accents: [{ id: 'fading-embers', sourceAt: (time) => {
      if (time < embers.end) return { x: 0, y: height, z: 0, floor: embers.floor }
    } }],
    sourceAt(time) {
      if (time < steam.start) return
      const patch = Math.sin(time * steam.xRate)
      return { x: patch * steam.xReach, y: height, z: Math.sin(time * steam.zRate) * steam.zReach, speed: steam.speed - Math.min(time, steam.fadeDuration) * steam.fadeRate }
    },
  }
}

export function ferrySparksFixture(meshes: MeshFactory): Fixture {
  const { deck, barrier, hinge, weld, crew: actor } = ferrySparksStage
  const wood = meshes.paintSurface('wood', deck.color)
  const steel = meshes.paintSurface('metal', barrier.color)
  for (let index = 0; index < deck.count; index++) {
    meshes.box(0, deck.y, (index - deck.centreIndex) * deck.spacing, ...deck.size, wood).receiveShadows = true
  }
  meshes.box(...barrier.position, ...barrier.size, steel)
  meshes.box(...hinge.position, ...hinge.size, hinge.color)
  meshes.box(...weld.position, ...weld.size, weld.color, undefined, false)
  const crew = crewAt(meshes, actor.x, actor.z)
  crew.root.rotation.y = actor.heading
  poseCrew(crew, 0, 0, false, 'tool', 1)
  return {
    sourceAt(time) {
      const { weld, source } = ferrySparksMotion
      const age = contactAge(time, ...weld)
      if (age !== undefined) return { x: source.x, y: source.y - age * source.downwardSpeed, z: source.z, floor: source.floor }
    },
  }
}
