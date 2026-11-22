import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { createCrew, createSkiffGear, paddleBladeOffset, poseCrew, poseSkiffCrew, skiffCrewSeats } from '../assets/crew'
import { createFlatbed, poseFlatbed } from '../assets/flatbed'
import { extinguisherStage, fireStage, leavesStage, mistStage, paddleStage, pollenStage, rainStage, shoreStage, tireDustStage, waterfallStage } from '../assets/geometry/workbench-effect-fixtures'
import { createLongAcreFlowers, longAcrePollenHeight } from '../assets/long-acre-flowers'
import { createRock, createSupply, createTree } from '../assets/props'
import type { particleAccents } from '../assets/recipes/particle-accents'
import { leavesSource, mistSource, paddleMotion, rainSource, shoreSource, tireDustMotion, waterfallSource } from '../assets/recipes/workbench-effect-fixtures'
import { createHarborBoat } from '../assets/waterfront'
import { extinguisherSource } from '../extinguisher-spray'
import type { MeshFactory } from '../island-meshes'
import type { ParticleOrigin, ParticleSource } from '../particle-motion'
import { flowerBeds, flowerOffsets } from '../second-island/long-acre'
import { flatbedGroundDrive } from '../vehicles/flatbed'
import type { FieldSite } from './field-site'
import { createMarketRunoffStage } from './market-awning-stage'

export interface Fixture {
  sourceAt: ParticleOrigin
  accents?: { id: keyof typeof particleAccents, sourceAt: ParticleOrigin }[]
  pose?(time: number): void
}

const halves = 2
const rightSkiffSeat = 1

export function crewAt(meshes: MeshFactory, x: number, z: number, id = 0) {
  const crew = createCrew(meshes, id)
  crew.root.position.set(x, 0, z)
  return crew
}

export function contactAge(time: number, start: number, period: number, width: number) {
  if (time < start) return
  const age = (time - start) % period
  if (age < width) return age
}

export function worldSource(source: ParticleSource, field?: FieldSite): ParticleSource {
  if (!field) return source
  const { x, y, z } = field.offset
  return {
    ...source,
    x: source.x + x,
    y: source.y + y,
    z: source.z + z,
    floor: source.floor === undefined ? undefined : source.floor + y,
  }
}

export function waterfallFixture(meshes: MeshFactory, field?: FieldSite): Fixture {
  if (!field) {
    const { pool, bluff, shelf, curtain, rock, crew } = waterfallStage
    meshes.box(...pool.position, ...pool.size, pool.color)
    meshes.box(...bluff.position, ...bluff.size, bluff.color)
    meshes.box(...shelf.position, ...shelf.size, shelf.color)
    meshes.box(...curtain.position, ...curtain.size, curtain.color).rotation.x = curtain.pitch
    createRock(meshes, rock.x, rock.z, rock.size, rock.heading, false)
    crewAt(meshes, crew.x, crew.z)
  }
  return { sourceAt: () => worldSource({ x: 0, y: field ? 0 : waterfallSource.studioY, z: 0 }, field) }
}

export function shoreFixture(meshes: MeshFactory): Fixture {
  const { water, beach, rocks, crew } = shoreStage
  meshes.box(...water.position, ...water.size, water.color)
  meshes.box(...beach.position, ...beach.size, beach.color)
  for (const x of rocks.x) createRock(meshes, x, rocks.z, rocks.size, x, true)
  crewAt(meshes, crew.x, crew.z)
  return { sourceAt: () => ({ ...shoreSource }) }
}

export function paddleFixture(meshes: MeshFactory): Fixture {
  const boat = createHarborBoat(meshes)
  boat.position.set(0, 0, 0)
  boat.rotation.y = 0
  const crew = createCrew(meshes, 1)
  crew.root.parent = boat
  crew.root.position.copyFrom(skiffCrewSeats[rightSkiffSeat])
  const [, gear] = createSkiffGear(meshes, crew)
  gear.grip.setEnabled(true)
  gear.rod.setEnabled(false)
  const { water } = paddleStage
  meshes.box(0, water.y, 0, ...water.size, water.color).receiveShadows = true
  const blade = new Vector3(...paddleBladeOffset)
  const { stroke, contact } = paddleMotion

  function pose(time: number) {
    const beat = (time - stroke.start) * Math.PI * halves / stroke.period
    const swing = Math.sin(beat)
    poseSkiffCrew(crew, swing, 1, false, 1)
    gear.paddle.rotation.x = -crew.arms[1].rotation.x + swing * stroke.pitchReach
    gear.paddle.rotation.z = stroke.roll + (1 - Math.cos(beat)) * stroke.rollReach
  }
  return {
    sourceAt(time) {
      pose(time)
      const { x, y, z } = Vector3.TransformCoordinates(blade, gear.paddle.computeWorldMatrix(true))
      if (y < contact.maximumY && y > contact.minimumY) return { x, y: Math.max(contact.sourceY, y), z, floor: contact.floor }
    },
    pose,
  }
}

export function rainFixture(meshes: MeshFactory): Fixture {
  const { crew, planks, rock } = rainStage
  crewAt(meshes, crew.x, crew.z)
  for (let i = 0; i < planks.count; i++) meshes.box(i * planks.spacing + planks.startX, planks.y, planks.z, ...planks.size, planks.color)
  createRock(meshes, rock.x, rock.z, rock.size, rock.heading, true)
  return { sourceAt: () => ({ ...rainSource }) }
}

export function roofFixture(meshes: MeshFactory): Fixture {
  const { curtain } = createMarketRunoffStage(meshes)
  return { sourceAt: () => curtain }
}

export function mistFixture(meshes: MeshFactory): Fixture {
  const { crew, rocks } = mistStage
  crewAt(meshes, crew.x, crew.z)
  for (const { x, z, size } of rocks) createRock(meshes, x, z, size, x, true)
  return { sourceAt: () => ({ ...mistSource }) }
}

export function leavesFixture(meshes: MeshFactory): Fixture {
  const { tree, crew } = leavesStage
  createTree(meshes, tree.x, tree.z, tree.height, tree.variant)
  crewAt(meshes, crew.x, crew.z)
  return { sourceAt: () => ({ ...leavesSource }) }
}

export function pollenFixture(meshes: MeshFactory): Fixture {
  const { crew } = pollenStage
  crewAt(meshes, crew.x, crew.z)
  const trefoilBed = 1
  createLongAcreFlowers(meshes, { ...flowerBeds[trefoilBed], x: 0, z: 0 }, trefoilBed, flowerOffsets, () => 0)
  return { sourceAt: () => ({ x: 0, y: longAcrePollenHeight, z: 0 }) }
}

export function dustFixture(meshes: MeshFactory, x = 0, z = 0): Fixture {
  const truck = createFlatbed(meshes)
  truck.root.position.set(x, 0, z)
  const { axles, halfTrack } = flatbedGroundDrive.wheels
  const { pad } = tireDustStage
  const { contact, wheelRate } = tireDustMotion
  const contactPoint = new Vector3(halfTrack + contact.outsideTire, contact.y, axles[0] - contact.behindAxle)
  meshes.box(x, pad.y, z - pad.offsetZ, ...pad.size, meshes.paintSurface('gravel', pad.color))
  return {
    sourceAt() {
      const { x, y, z } = Vector3.TransformCoordinates(contactPoint, truck.root.computeWorldMatrix(true))
      return { x, y, z, floor: y - contact.floorOffset }
    },
    pose: (time) => poseFlatbed(truck, time * wheelRate, 0),
  }
}

export function fireFixture(meshes: MeshFactory, y: number, field?: FieldSite): Fixture {
  const { crew } = fireStage
  crewAt(meshes, crew.x, crew.z)
  return { sourceAt: () => worldSource({ x: 0, y, z: 0 }, field) }
}

export function extinguisherFixture(meshes: MeshFactory, busy: boolean): Fixture {
  const { crew, tool: toolPlacement, partner } = extinguisherStage
  const operator = crewAt(meshes, crew.x, crew.z)
  poseCrew(operator, 0, 0, false, 'extinguisher', 1)
  const tool = createSupply(meshes, 'extinguisher')
  tool.position.set(0, toolPlacement.y, toolPlacement.z)
  if (busy) {
    const observer = crewAt(meshes, partner.x, partner.z, partner.id)
    observer.root.rotation.y = Math.PI * partner.headingPi
  }
  return { sourceAt: () => extinguisherSource(tool) }
}
