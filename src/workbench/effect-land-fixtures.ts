import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createFarmTools, poseCrew } from '../assets/crew'
import { farmFurrowTop } from '../assets/farm'
import { crewHoe } from '../assets/geometry/crew-equipment'
import { harvestChaffStage, hoeStage, seedParachuteStage, takeoffFeatherStage, wetFernStage } from '../assets/geometry/workbench-land-fixtures'
import { harvestChaffMotion, hoeMotion, seedParachuteMotion, takeoffFeatherMotion, wetFernMotion } from '../assets/recipes/workbench-land-fixtures'
import { createRock } from '../assets/props'
import { juniperFern, sampleUnderstoryBlade, understoryBladeCount, understoryGroundOffset } from '../assets/understory'
import { createFarm } from '../island-farm'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { wingedAnimal } from '../wildlife'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

const half = 0.5
const halves = 2

export function parachutesFixture(meshes: MeshFactory): Fixture {
  const { ground, crew, flowers } = seedParachuteStage
  const { stem, head } = flowers
  meshes.box(0, ground.y, 0, ...ground.size, ground.color).receiveShadows = true
  crewAt(meshes, crew.x, crew.z, crew.id)
  for (let i = 0; i < flowers.count; i++) {
    const x = flowers.x + i % flowers.columns * flowers.columnSpacing
    const z = flowers.z + Math.floor(i / flowers.columns) * flowers.rowSpacing
    const height = flowers.height + flowers.heightVariation * Math.sin(i * flowers.variationFrequency)
    meshes.cylinder(x, height * half, z, stem.top, stem.bottom, height, stem.sides, stem.color)
    meshes.sphere(x, height, z, ...head.size, head.color, undefined, true, head.segments)
  }
  const { release, source } = seedParachuteMotion
  return {
    sourceAt(time) {
      if (contactAge(time, ...release) !== undefined) {
        return { x: source.x + Math.sin(time * source.frequency) * source.sway, y: source.y, z: source.z }
      }
    },
  }
}

export function fernFixture(meshes: MeshFactory): Fixture {
  const { ground, crew: actor } = wetFernStage
  meshes.box(0, ground.y, 0, ...ground.size, ground.color).receiveShadows = true
  const crew = crewAt(meshes, actor.x, actor.z, actor.id)
  crew.root.rotation.y = actor.heading
  poseCrew(crew, 0, 0, false, undefined, 1)
  const frond = new TransformNode('Brushed frond', meshes.scene)
  const paint = meshes.paint(juniperFern.color)
  paint.backFaceCulling = false
  const random = seededRandom(juniperFern.seed)
  const base = { x: 0, y: understoryGroundOffset, z: 0 }
  const verticesPerBlade = 6
  const indices = Array.from({ length: verticesPerBlade }, (_, index) => index)
  const scale = 1
  const first = sampleUnderstoryBlade(juniperFern, base, Math.PI, 0, scale, random)
  meshes.surface(juniperFern.name, first.positions, indices, paint, frond)
  for (let leaf = 1; leaf < understoryBladeCount; leaf++) {
    const { positions } = sampleUnderstoryBlade(juniperFern, base, Math.PI, leaf, scale, random)
    meshes.surface(juniperFern.name, positions, indices, paint)
  }
  const tip = Vector3.FromArray(first.tip)
  const { brush, shake, releaseDuration, floor } = wetFernMotion
  const pulse = (time: number) => contactAge(time, ...brush)
  function pose(time: number) {
    const t = pulse(time)
    const remaining = t === undefined ? 0 : Math.exp(-t * shake.damping)
    frond.rotation.x = t === undefined ? 0 : shake.pitch * Math.sin(t * shake.pitchFrequency) * remaining
    frond.rotation.z = t === undefined ? 0 : Math.sin(t * shake.rollFrequency) * shake.roll * remaining
  }
  return {
    sourceAt(time) {
      const t = pulse(time)
      if (t === undefined || t > releaseDuration) return
      pose(time)
      const { x, y, z } = Vector3.TransformCoordinates(tip, frond.computeWorldMatrix(true))
      return { x, y, z, floor }
    },
    pose,
  }
}

export function hoeFixture(meshes: MeshFactory): Fixture {
  const { plot, crew: actor } = hoeStage
  const showPlot = createFarm(meshes, [plot], () => 0)
  showPlot(['tilled'])
  const crew = crewAt(meshes, actor.x, actor.z)
  const { hoe } = createFarmTools(meshes, crew)
  hoe.setEnabled(true)
  const blade = new Vector3(...crewHoe.soilContact)
  const { contact, swing, minimumSourceY } = hoeMotion
  const [, period] = contact
  function pose(time: number) {
    const beat = (time - swing.start) * Math.PI * halves / period
    poseCrew(crew, 0, 0, false, 'tool')
    crew.arms[0].rotation.x = swing.restingPitch - (1 - Math.cos(beat)) * swing.reach
    hoe.rotation.z = swing.toolRoll
  }
  return {
    sourceAt(time) {
      if (contactAge(time, ...contact) === undefined) return
      pose(time)
      const { x, y, z } = Vector3.TransformCoordinates(blade, hoe.computeWorldMatrix(true))
      return { x, y: Math.max(minimumSourceY, y), z, floor: farmFurrowTop }
    },
    pose,
  }
}

function cutBarley(meshes: MeshFactory) {
  const bundle = new TransformNode('Cut barley', meshes.scene)
  const { bundle: layout } = harvestChaffStage
  const { stem, head, base } = layout
  for (let index = 0; index < layout.count; index++) {
    const x = (index % layout.columns - layout.columnCentre) * layout.columnSpacing
    const z = (Math.floor(index / layout.columns) - layout.rowCentre) * layout.rowSpacing
    const height = layout.height + layout.heightVariation * Math.cos(index * layout.variationFrequency)
    meshes.cylinder(x, stem.y, z, stem.top, stem.bottom, height, stem.sides, stem.color, bundle)
    meshes.sphere(x, height * head.heightRatio, z, ...head.size, head.colors[index % head.colors.length], bundle)
  }
  meshes.box(0, base.y, 0, ...base.size, base.color, bundle)
  return bundle
}

export function chaffFixture(meshes: MeshFactory): Fixture {
  const { crew: actor, ground, stubble } = harvestChaffStage
  const crew = crewAt(meshes, actor.x, actor.z)
  crew.root.rotation.y = actor.heading
  poseCrew(crew, 0, 0, false, 'crate')
  const bundle = cutBarley(meshes)
  meshes.box(0, ground.y, ground.z, ...ground.size, ground.color).receiveShadows = true
  const { stem } = stubble
  for (let index = 0; index < stubble.count; index++) {
    const x = stubble.x + stubble.xVariation * Math.cos(index * stubble.xFrequency)
    const z = stubble.z + Math.cos(index * stubble.zFrequency) * stubble.zVariation
    meshes.cylinder(x, stem.y, z, stem.top, stem.bottom, stem.height, stem.sides, stem.color)
  }
  const { release, source, swayFrequency, bundle: motion } = harvestChaffMotion
  function sourceAt(time: number) {
    if (contactAge(time, ...release) !== undefined) {
      return { x: source.x, y: source.y + source.bob * Math.sin(time * swayFrequency), z: source.z, floor: source.floor }
    }
  }
  return {
    sourceAt,
    accents: [{ id: 'chaff-dust', sourceAt }],
    pose(time) {
      bundle.position.set(motion.x, motion.y + motion.bob * Math.sin(time * swayFrequency), motion.z)
      bundle.rotation.z = motion.roll + motion.rollSway * Math.sin(time * motion.rollFrequency)
    },
  }
}

export function feathersFixture(meshes: MeshFactory): Fixture {
  const { bird: model, crew: actor, rock } = takeoffFeatherStage
  const bird = wingedAnimal(meshes, model.color, false)
  bird.root.rotation.y = model.heading
  bird.root.scaling.setAll(model.scale)
  const crew = crewAt(meshes, actor.x, actor.z, actor.id)
  crew.root.rotation.y = actor.heading
  createRock(meshes, rock.x, rock.z, rock.size, rock.heading, false)
  const { feathers, takeoff, wings } = takeoffFeatherMotion
  return {
    sourceAt(time) {
      if (time >= feathers.start && time < feathers.end) return { x: feathers.x + time - feathers.start, y: feathers.y, z: feathers.z, floor: feathers.floor }
    },
    pose(time) {
      const launch = Math.max(0, Math.min(time - takeoff.start, takeoff.duration))
      const flap = launch > 0 ? Math.sin(launch * wings.flapRate) * wings.flapReach : wings.restingRoll
      bird.root.position.set(takeoff.x + launch * takeoff.xSpeed, takeoff.y + Math.min(takeoff.maxClimb, launch * takeoff.climb), takeoff.z + launch * takeoff.zSpeed)
      bird.wings[0].rotation.z = flap
      bird.wings[1].rotation.z = -flap
    },
  }
}
