import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { buildHarvestedCarrot } from '../assets/barrow'
import { poseCrew } from '../assets/crew'
import { farmFurrowTop } from '../assets/farm'
import { carrotPullStage, cloverStepStage, hedgeClippingStage, hiveTrafficStage, looseSlateStage } from '../assets/geometry/workbench-land-fixtures'
import { buildHoneyHive, honeyHiveEntrance } from '../assets/honey-props'
import { createRock } from '../assets/props'
import { carrotPullMotion, cloverStepMotion, hedgeClippingMotion, hiveTrafficMotion, looseSlateMotion } from '../assets/recipes/workbench-land-fixtures'
import { createGroundCover } from '../biome-scenery'
import { createFarm } from '../island-farm'
import type { MeshFactory } from '../island-meshes'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

const half = 0.5
const quarterTurn = Math.PI * half

export function carrotPullFixture(meshes: MeshFactory): Fixture {
  const { crew: actor, row } = carrotPullStage
  const crew = crewAt(meshes, actor.x, actor.z)
  crew.root.rotation.y = actor.heading
  const showPlot = createFarm(meshes, [row], () => 0)
  showPlot(['ripe'])
  const carrot = new TransformNode('Lifted carrot', meshes.scene)
  const liftedRoot = new TransformNode('Upright harvested carrot', meshes.scene)
  liftedRoot.parent = carrot
  liftedRoot.rotation.x = -quarterTurn
  buildHarvestedCarrot(meshes, liftedRoot)
  carrot.setEnabled(false)
  const { pull, release, carrot: motion, arm, soil } = carrotPullMotion
  const [, , pullDuration] = pull
  const pullAge = (time: number) => contactAge(time, ...pull) ?? 0
  function lift(time: number) {
    return motion.restingY + motion.lift * Math.sin(pullAge(time) / pullDuration * Math.PI) ** motion.liftPower
  }
  return {
    sourceAt(time) {
      const t = contactAge(time, ...release)
      if (t !== undefined) return { x: soil.x + t * soil.spread, y: Math.max(soil.minimumY, lift(time) - soil.belowCarrot), z: row.z, floor: farmFurrowTop }
    },
    pose(time) {
      const height = lift(time)
      const age = pullAge(time)
      showPlot([age > 0 ? 'tilled' : 'ripe'])
      carrot.setEnabled(age > 0)
      carrot.position.set(row.x + age * motion.slide, height, row.z)
      carrot.rotation.z = motion.roll * Math.sin(age * motion.rollFrequency)
      crew.arms[0].rotation.x = -Math.max(arm.restingPitch, (height - arm.reachHeight) * arm.reachGain)
    },
  }
}

export function hiveTrafficFixture(meshes: MeshFactory): Fixture {
  const hive = new TransformNode('Long Acre hive', meshes.scene)
  buildHoneyHive(meshes, hive, 'light')
  const { crew } = hiveTrafficStage
  crewAt(meshes, crew.x, crew.z, crew.id)
  const { lanes, centreLane, directionCycle, inbound, outbound } = hiveTrafficMotion
  const laneWidth = honeyHiveEntrance.width / lanes
  return {
    sourceAt(time, index) {
      const direction = index % directionCycle
      const inward = direction === 0 || direction === 1
      const distance = inward ? inbound.start + (index % inbound.sequence) * inbound.spacing : 0
      return {
        x: (index % lanes - centreLane) * laneWidth,
        y: honeyHiveEntrance.y + distance * inbound.heightRatio,
        z: honeyHiveEntrance.z + distance,
        yaw: inward ? Math.PI + Math.sin(time * inbound.yawFrequency) * inbound.yawSway : 0,
        pitch: inward ? inbound.pitch : outbound.pitch,
        speed: inward ? inbound.speed : 1,
        floor: honeyHiveEntrance.floor,
      }
    },
  }
}

export function cloverStepFixture(meshes: MeshFactory): Fixture {
  const { ground, patches } = cloverStepStage
  meshes.box(0, ground.y, 0, ...ground.size, ground.color).receiveShadows = true
  const crew = crewAt(meshes, 0, 0, 1)
  for (let i = 0; i < patches.count; i++) {
    const x = patches.x + Math.sin(i * patches.xFrequency) * patches.xVariation
    const z = patches.z + i * patches.spacing + Math.sin(i * patches.zFrequency) * patches.zVariation
    const patch = createGroundCover(meshes, false)
    patch.position.set(x, 0, z)
  }
  const { contact, walk, source } = cloverStepMotion
  const [firstStep] = contact
  const path = (time: number) => walk.startZ + Math.min(walk.stop, time) * walk.speed
  return {
    sourceAt(time) {
      const t = contactAge(time, ...contact)
      if (t !== undefined) return { x: source.x, y: source.y, z: path(time - t) + source.ahead, floor: source.floor }
    },
    pose(time) {
      crew.root.position.set(walk.x, 0, path(time))
      crew.root.rotation.y = walk.heading
      poseCrew(crew, (Math.min(time, walk.stop) - firstStep) / walk.stride + walk.phase, time < walk.stop ? walk.strength : 0, false)
    },
  }
}

export function slateFixture(meshes: MeshFactory): Fixture {
  const { slope, ground, slabs, rock, crew } = looseSlateStage
  meshes.box(slope.x, slope.y, slope.z, ...slope.size, slope.color).rotation.x = slope.pitch
  meshes.box(ground.x, ground.y, 0, ...ground.size, ground.color).receiveShadows = true
  for (let i = 0; i < slabs.count; i++) {
    const z = slabs.z + i * slabs.spacing
    const x = slabs.x + Math.sin(i * slabs.xFrequency) * slabs.xVariation
    const y = slabs.y - (z - slope.z) * slope.pitch
    const slab = meshes.box(x, y, z, ...slabs.size, slabs.colors[i % slabs.colors.length])
    slab.rotation.set(slope.pitch, i * slabs.yawStep, slabs.roll)
  }
  createRock(meshes, rock.x, rock.z, rock.size, rock.heading, false)
  crewAt(meshes, crew.x, crew.z, crew.id)
  const { release, source } = looseSlateMotion
  return {
    sourceAt(time, index) {
      const age = contactAge(time, ...release)
      if (age !== undefined) return { x: source.x + (index % source.lanes) * source.spacing, y: source.y, z: source.z + age * source.drift, floor: source.floor }
    },
  }
}

export function hedgeFixture(meshes: MeshFactory): Fixture {
  const { shrubs, crew: actor, shears } = hedgeClippingStage
  for (let i = 0; i < shrubs.count; i++) {
    const x = (i - shrubs.centreIndex) * shrubs.spacing
    const y = shrubs.y + shrubs.yVariation * Math.cos(i * shrubs.variationFrequency)
    meshes.sphere(x, y, shrubs.z, ...shrubs.size, shrubs.colors[i % shrubs.colors.length], undefined, true, shrubs.segments)
  }
  const crew = crewAt(meshes, actor.x, actor.z)
  crew.root.rotation.y = Math.PI
  poseCrew(crew, 0, 0, false, 'tool', 1, 1, 0, false, true)
  const pivot = new TransformNode('Hedge shears', meshes.scene)
  const blades = [-1, 1].map((side) => {
    const pivotSide = new TransformNode('Shear handle and blade', meshes.scene)
    pivotSide.parent = pivot
    meshes.box(0, 0, shears.handle.z, ...shears.handle.size, shears.handle.color, pivotSide)
    meshes.box(0, 0, shears.blade.z, ...shears.blade.size, shears.blade.color, pivotSide)
    return { side, pivotSide }
  })
  const { close, release, shears: motion, source } = hedgeClippingMotion
  const [, , closeDuration] = close
  const clip = (time: number) => contactAge(time, ...close) ?? closeDuration
  const shearsX = (time: number) => motion.x + motion.sway * Math.sin(time * motion.swayFrequency)
  return {
    sourceAt(time) {
      if (contactAge(time, ...release) !== undefined) {
        return { x: shearsX(time), y: motion.y, z: source.z, floor: source.floor }
      }
    },
    pose(time) {
      pivot.position.set(shearsX(time), motion.y, motion.z)
      pivot.rotation.y = Math.PI
      const opening = motion.minimumOpening + Math.sin(clip(time) / closeDuration * Math.PI) * motion.openingRange
      for (const { side, pivotSide } of blades) pivotSide.rotation.y = side * opening
    },
  }
}
