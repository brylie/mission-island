import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { createCrew, createSkiffGear, poseCrew, poseSkiffCrew, skiffCrewSeats } from '../assets/crew'
import { createFlatbed, poseFlatbed } from '../assets/flatbed'
import { createRock, createSupply, createTree } from '../assets/props'
import { createHarborBoat } from '../assets/waterfront'
import { extinguisherSource } from '../extinguisher-spray'
import type { MeshFactory } from '../island-meshes'
import type { ParticleOrigin, ParticleSource } from '../particle-motion'
import { flatbedGroundDrive } from '../vehicles/flatbed'
import type { particleAccents } from '../particle-shelf-recipes'
import type { FieldSite } from './field-site'

export interface Fixture {
  sourceAt: ParticleOrigin
  accents?: { id: keyof typeof particleAccents; sourceAt: ParticleOrigin }[]
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
    ...source, x: source.x + x, y: source.y + y, z: source.z + z,
    floor: source.floor === undefined ? undefined : source.floor + y,
  }
}

export function waterfallFixture(meshes: MeshFactory, field?: FieldSite): Fixture {
  if (!field) {
    meshes.box(0, -.06, -.7, 7.2, .16, 4.6, water)
    meshes.box(0, 1.04, 1.8, 6.5, 2.08, 2.1, rock)
    meshes.box(0, 2.08, 1.94, 5.2, .08, 1.65, water)
    const curtain = meshes.box(0, 1.04, .36, 5.2, 2.23, .05, '#71b9bc')
    curtain.rotation.x = .41
    createRock(meshes, -2.9, -.06, 1.1, .3, false)
    crewAt(meshes, 3.9, -1.35)
  }
  return { sourceAt: () => worldSource({ x: 0, y: field ? 0 : .08, z: 0 }, field) }
}

export function shoreFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -.14, -1.28, 5, .29, 2.56, water)
  meshes.box(0, -.16, 1.13, 5, .33, 2.26, '#b7956c')
  for (const x of [-1.64, -.36, 1.22]) createRock(meshes, x, .18, .49, x, true)
  crewAt(meshes, 2.04, 1.16)
  return { sourceAt: () => ({ x: 0, y: .05, z: 0, floor: .012 }) }
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
  meshes.box(0, -.14, 0, 7, .29, 6.4, water).receiveShadows = true
  const blade = new Vector3(0, -1.06, 0)

  function pose(time: number) {
    const beat = (time - .34) * Math.PI * 2 / .85
    const stroke = Math.sin(beat)
    poseSkiffCrew(crew, stroke, 1, false, 1)
    gear.paddle.rotation.x = -crew.arms[1].rotation.x + stroke * .45
    gear.paddle.rotation.z = 1.02 + (1 - Math.cos(beat)) * .24
  }
  return {
    sourceAt(time) {
      pose(time)
      const { x, y, z } = Vector3.TransformCoordinates(blade, gear.paddle.computeWorldMatrix(true))
      if (y < .19 && y > -.15) return { x, y: Math.max(.026, y), z, floor: .012 }
    },
    pose,
  }
}

export function rainFixture(meshes: MeshFactory): Fixture {
  crewAt(meshes, -.1, -.23)
  for (let i = 0; i < 4; i++) meshes.box(i * .55 - .8, .02, -.5, .53, .045, 2.1, '#566964')
  createRock(meshes, 1.4, .65, .84, -.35, true)
  return { sourceAt: () => ({ x: -.6, y: 4.35, z: -.45, floor: .09 }) }
}

export function roofFixture(meshes: MeshFactory): Fixture {
  for (const x of [-1.4, 1.4]) meshes.box(x, 1.15, -.68, .14, 2.3, .15, '#776555')
  const roof = meshes.box(0, 2.57, -.65, 3.28, .13, 1.55, '#697879')
  roof.rotation.x = .25
  meshes.box(0, 2.36, .12, 3.28, .09, .12, '#564b41')
  crewAt(meshes, -1.95, .08)
  return { sourceAt: () => ({ x: 0, y: 2.309, z: .14, floor: .045 }) }
}

export function mistFixture(meshes: MeshFactory): Fixture {
  crewAt(meshes, -.8, -1.28)
  for (const [x, z, size] of [[-.8, .29, .68], [.9, -1.2, .82], [2.04, .9, .58], [-1.8, -.45, .8]]) {
    createRock(meshes, x, z, size, x, true)
  }
  return { sourceAt: () => ({ x: -.75, y: .19, z: 0, floor: .025 }) }
}

export function leavesFixture(meshes: MeshFactory): Fixture {
  createTree(meshes, -.9, -.5, 2.8, 0)
  crewAt(meshes, 1.23, -.75)
  return { sourceAt: () => ({ x: -.55, y: 1.69, z: -.25, floor: .035 }) }
}

export function pollenFixture(meshes: MeshFactory): Fixture {
  crewAt(meshes, -.8, -.85)
  for (let index = 0; index < 15; index++) {
    const x = Math.cos(index * 2.4) * (index + 3) * .077
    const z = Math.sin(index * 2.4) * (index + 2) * .047
    const height = .33 + (index % 4) * .096
    meshes.cylinder(x, height / 2, z, .027, .034, height, 5, '#63855a')
    meshes.sphere(x, height, z, .16, .083, .16, index % 4 ? '#e8c967' : '#edd3a8')
  }
  return { sourceAt: () => ({ x: 0, y: .58, z: .02 }) }
}

export function dustFixture(meshes: MeshFactory, x = 0, z = 0): Fixture {
  const truck = createFlatbed(meshes)
  truck.root.position.set(x, 0, z)
  const { axles, halfTrack } = flatbedGroundDrive.wheels
  const contact = new Vector3(halfTrack + .08, .055, axles[0] - .12)
  meshes.box(x, -.048, z - .75, 3.85, .084, 7.7, meshes.paintSurface('gravel', gravel))
  return {
    sourceAt() {
      const { x, y, z } = Vector3.TransformCoordinates(contact, truck.root.computeWorldMatrix(true))
      return { x, y, z, floor: y - .056 }
    },
    pose: time => poseFlatbed(truck, time * 10, 0),
  }
}

export function fireBed(meshes: MeshFactory) {
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3
    createRock(meshes, Math.cos(angle) * .85, Math.sin(angle) * .62, .37, angle, false)
  }
  for (const angle of [-.9, .4, 1.8]) {
    meshes.box(0, .16, 0, 1.3, .24, .22, '#514035').rotation.y = angle
    meshes.box(0, .235, 0, .71, .095, .178, '#c26e37').rotation.y = angle
  }
}

export function fireFixture(meshes: MeshFactory, y: number, field?: FieldSite): Fixture {
  fireBed(meshes)
  crewAt(meshes, -1.65, -.9)
  return { sourceAt: () => worldSource({ x: 0, y, z: 0 }, field) }
}

export function extinguisherFixture(meshes: MeshFactory, busy: boolean): Fixture {
  const crew = crewAt(meshes, .49, -3.82)
  poseCrew(crew, 0, 0, false, 'extinguisher', 1)
  const tool = createSupply(meshes, 'extinguisher')
  tool.position.set(0, .24, -3.23)
  if (busy) {
    const partner = crewAt(meshes, 2.7, .9, 1)
    partner.root.rotation.y = -Math.PI * .72
    fireBed(meshes)
  }
  return { sourceAt: () => extinguisherSource(tool) }
}
