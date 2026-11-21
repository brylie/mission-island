import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { createCrew, createSkiffGear, paddleBladeOffset, poseCrew, poseSkiffCrew, skiffCrewSeats } from '../assets/crew'
import { createFlatbed, poseFlatbed } from '../assets/flatbed'
import { createLongAcreFlowers, longAcrePollenHeight } from '../assets/long-acre-flowers'
import { createRock, createSupply, createTree } from '../assets/props'
import { createHarborBoat } from '../assets/waterfront'
import { extinguisherSource } from '../extinguisher-spray'
import type { MeshFactory } from '../island-meshes'
import type { ParticleOrigin, ParticleSource } from '../particle-motion'
import { flowerBeds, flowerOffsets } from '../second-island/long-acre'
import { flatbedGroundDrive } from '../vehicles/flatbed'
import type { particleAccents } from '../assets/particle-shelf-recipes'
import type { FieldSite } from './field-site'
import { createMarketRunoffStage } from './market-awning-stage'

export interface Fixture {
  sourceAt: ParticleOrigin
  accents?: { id: keyof typeof particleAccents, sourceAt: ParticleOrigin }[]
  pose?(time: number): void
}

const water = '#539ca4'
const rock = '#667579'
const gravel = '#736853'

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
    meshes.box(0, -0.06, -0.7, 7.2, 0.16, 4.6, water)
    meshes.box(0, 1.04, 1.8, 6.5, 2.08, 2.1, rock)
    meshes.box(0, 2.08, 1.94, 5.2, 0.08, 1.65, water)
    const curtain = meshes.box(0, 1.04, 0.36, 5.2, 2.23, 0.05, '#71b9bc')
    curtain.rotation.x = 0.41
    createRock(meshes, -2.9, -0.06, 1.1, 0.3, false)
    crewAt(meshes, 3.9, -1.35)
  }
  return { sourceAt: () => worldSource({ x: 0, y: field ? 0 : 0.08, z: 0 }, field) }
}

export function shoreFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -0.14, -1.28, 5, 0.29, 2.56, water)
  meshes.box(0, -0.16, 1.13, 5, 0.33, 2.26, '#b7956c')
  for (const x of [-1.64, -0.36, 1.22]) createRock(meshes, x, 0.18, 0.49, x, true)
  crewAt(meshes, 2.04, 1.16)
  return { sourceAt: () => ({ x: 0, y: 0.05, z: 0, floor: 0.012 }) }
}

export function paddleFixture(meshes: MeshFactory): Fixture {
  const boat = createHarborBoat(meshes)
  boat.position.set(0, 0, 0)
  boat.rotation.y = 0
  const crew = createCrew(meshes, 1)
  crew.root.parent = boat
  crew.root.position.copyFrom(skiffCrewSeats[1])
  const [, gear] = createSkiffGear(meshes, crew)
  gear.grip.setEnabled(true)
  gear.rod.setEnabled(false)
  meshes.box(0, -0.14, 0, 7, 0.29, 6.4, water).receiveShadows = true
  const blade = new Vector3(...paddleBladeOffset)

  function pose(time: number) {
    const beat = (time - 0.34) * Math.PI * 2 / 0.85
    const stroke = Math.sin(beat)
    poseSkiffCrew(crew, stroke, 1, false, 1)
    gear.paddle.rotation.x = -crew.arms[1].rotation.x + stroke * 0.45
    gear.paddle.rotation.z = 1.02 + (1 - Math.cos(beat)) * 0.24
  }
  return {
    sourceAt(time) {
      pose(time)
      const { x, y, z } = Vector3.TransformCoordinates(blade, gear.paddle.computeWorldMatrix(true))
      if (y < 0.19 && y > -0.15) return { x, y: Math.max(0.026, y), z, floor: 0.012 }
    },
    pose,
  }
}

export function rainFixture(meshes: MeshFactory): Fixture {
  crewAt(meshes, -0.1, -0.23)
  for (let i = 0; i < 4; i++) meshes.box(i * 0.55 - 0.8, 0.02, -0.5, 0.53, 0.045, 2.1, '#566964')
  createRock(meshes, 1.4, 0.65, 0.84, -0.35, true)
  return { sourceAt: () => ({ x: -0.6, y: 4.35, z: -0.45, floor: 0.09 }) }
}

export function roofFixture(meshes: MeshFactory): Fixture {
  const { curtain } = createMarketRunoffStage(meshes)
  return { sourceAt: () => curtain }
}

export function mistFixture(meshes: MeshFactory): Fixture {
  crewAt(meshes, -0.8, -1.28)
  for (const [x, z, size] of [[-0.8, 0.29, 0.68], [0.9, -1.2, 0.82], [2.04, 0.9, 0.58], [-1.8, -0.45, 0.8]]) {
    createRock(meshes, x, z, size, x, true)
  }
  return { sourceAt: () => ({ x: -0.75, y: 0.19, z: 0, floor: 0.025 }) }
}

export function leavesFixture(meshes: MeshFactory): Fixture {
  createTree(meshes, -0.9, -0.5, 2.8, 0)
  crewAt(meshes, 1.23, -0.75)
  return { sourceAt: () => ({ x: -0.55, y: 1.69, z: -0.25, floor: 0.035 }) }
}

export function pollenFixture(meshes: MeshFactory): Fixture {
  crewAt(meshes, -0.8, -0.85)
  const trefoilBed = 1
  createLongAcreFlowers(meshes, { ...flowerBeds[trefoilBed], x: 0, z: 0 }, trefoilBed, flowerOffsets, () => 0)
  return { sourceAt: () => ({ x: 0, y: longAcrePollenHeight, z: 0 }) }
}

export function dustFixture(meshes: MeshFactory, x = 0, z = 0): Fixture {
  const truck = createFlatbed(meshes)
  truck.root.position.set(x, 0, z)
  const { axles, halfTrack } = flatbedGroundDrive.wheels
  const contact = new Vector3(halfTrack + 0.08, 0.055, axles[0] - 0.12)
  meshes.box(x, -0.048, z - 0.75, 3.85, 0.084, 7.7, meshes.paintSurface('gravel', gravel))
  return {
    sourceAt() {
      const { x, y, z } = Vector3.TransformCoordinates(contact, truck.root.computeWorldMatrix(true))
      return { x, y, z, floor: y - 0.056 }
    },
    pose: (time) => poseFlatbed(truck, time * 10, 0),
  }
}

export function fireFixture(meshes: MeshFactory, y: number, field?: FieldSite): Fixture {
  crewAt(meshes, -1.65, -0.9)
  return { sourceAt: () => worldSource({ x: 0, y, z: 0 }, field) }
}

export function extinguisherFixture(meshes: MeshFactory, busy: boolean): Fixture {
  const crew = crewAt(meshes, 0.49, -3.82)
  poseCrew(crew, 0, 0, false, 'extinguisher', 1)
  const tool = createSupply(meshes, 'extinguisher')
  tool.position.set(0, 0.24, -3.23)
  if (busy) {
    const partner = crewAt(meshes, 2.7, 0.9, 1)
    partner.root.rotation.y = -Math.PI * 0.72
  }
  return { sourceAt: () => extinguisherSource(tool) }
}
