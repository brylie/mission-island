import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { poseCrew } from '../assets/crew'
import { createFlatbed, poseFlatbed } from '../assets/flatbed'
import { createHarborBoat } from '../assets/waterfront'
import type { MeshFactory } from '../island-meshes'
import { flatbedGroundDrive } from '../vehicles/flatbed'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

const dockWood = '#9e7951'
const water = '#44848d'

export function bobberFixture(meshes: MeshFactory): Fixture {
  const pier = meshes.paintSurface('wood', dockWood)
  meshes.box(0, -.12, 0, 4.35, .24, 3.52, water, undefined, false)
  for (const z of [-1.25, -.83, -.42, 0, .42, .83, 1.25]) meshes.box(-1.65, .05, z, 1.05, .1, .4, pier)
  const crew = crewAt(meshes, -1.66, -.08)
  crew.root.rotation.y = Math.PI / 2
  poseCrew(crew, 0, 0, false, 'tool', .85)
  const rod = meshes.cylinder(-.89, 1.23, -.46, .025, .051, 1.3, 7, '#6e573f')
  rod.rotation.z = -1.18
  const bobber = new TransformNode('Dipping float', meshes.scene)
  meshes.sphere(0, .033, 0, .159, .182, .163, '#d95846', bobber)
  meshes.sphere(0, .08, 0, .123, .069, .128, '#f4dfbc', bobber)
  const tug = (time: number) => contactAge(time, .39, .94, .41) ?? 0
  const tugDistance = (age: number) => Math.sin(age / .41 * Math.PI)
  return {
    sourceAt(time) {
      const age = contactAge(time, .413, .94, .14)
      if (age !== undefined) return { x: .32 + tugDistance(age) * .16, y: .018, z: .02 }
    },
    pose(time) {
      const pull = tugDistance(tug(time))
      bobber.position.set(.32 + .19 * pull, -.126 * pull + .012 * Math.sin(time * 6.2), .02)
      bobber.rotation.z = pull * -.36
    },
  }
}

export function slipwayFixture(meshes: MeshFactory): Fixture {
  const truck = createFlatbed(meshes)
  const apron = meshes.paintSurface('concrete', '#778681')
  meshes.box(0, -.061, -.15, 4.7, .122, 9, apron).receiveShadows = true
  meshes.box(.94, .013, .15, 1.25, .023, 2.5, '#508f98', undefined, false)
  meshes.box(-.94, .013, .15, 1.25, .023, 2.5, '#508f98', undefined, false)
  for (const side of [-1, 1]) meshes.box(side * 2.2, .005, -.12, .08, .018, 8.7, '#c2c3ad', undefined, false)
  const travel = (time: number) => -2.85 + Math.min(time, 3.16) * 1.18
  return {
    sourceAt(time, index) {
      const z = travel(time) + flatbedGroundDrive.wheels.axles[1]
      if (z < -.91 || z > 1.28) return
      const side = index % 3 ? 1 : -1
      return { x: flatbedGroundDrive.wheels.halfTrack * side, y: .071, z,
        yaw: side > 0 ? .17 : -1.35, speed: .85 + time * .14, floor: .031 }
    },
    pose(time) {
      truck.root.position.set(0, .013, travel(time))
      poseFlatbed(truck, Math.min(time, 3.16) * 3.4, 0)
    },
  }
}

export function hullDrainFixture(meshes: MeshFactory): Fixture {
  const boat = createHarborBoat(meshes)
  boat.position.set(0, 1.02, -.28)
  boat.rotation.set(.175, Math.PI, 0)
  for (const z of [-1.45, .91]) {
    meshes.box(0, .51, z, 2.57, .17, .25, dockWood)
    for (const x of [-.98, .98]) meshes.box(x, .235, z, .21, .47, .22, '#7f6b4d')
  }
  meshes.box(0, -.056, 0, 3.95, .112, 6.65, '#818b79').receiveShadows = true
  meshes.cylinder(0, .015, 2.36, .94, .94, .025, 14, '#527b7b', undefined, false)
  const crew = crewAt(meshes, 1.7, 1.69, 1)
  crew.root.rotation.y = -1.7
  const bung = new Vector3(0, -.245, -2.23)
  return {
    sourceAt(time) {
      if (time > 2.38 && contactAge(time, 2.4, .22, .079) === undefined) return
      const { x, y, z } = Vector3.TransformCoordinates(bung, boat.computeWorldMatrix(true))
      return { x, y, z, speed: 1.18 - Math.min(time, 2.9) * .2, floor: .026 }
    },
  }
}

export function mooringShakeFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -.096, 0, 5.55, .193, 3.28, water, undefined, false)
  meshes.box(0, .056, -.84, 5.35, .108, .89, meshes.paintSurface('wood', dockWood))
  for (const x of [-1.65, 1.65]) meshes.cylinder(x, .37, -.18, .22, .27, .75, 8, '#715f43')
  crewAt(meshes, -1.81, -.95)
  const rope = Array.from({ length: 12 }, () => meshes.box(0, 0, 0, .28, .035, .041, '#d0ac76', undefined, false))
  const wave = (time: number) => contactAge(time, .37, .98, .63)
  function lineHeight(time: number, along: number) {
    const t = wave(time)
    const snap = t === undefined ? 0 : Math.sin(t * 25 - along * 7) * Math.exp(-t * 6) * .145
    return .67 + Math.sin(along * Math.PI) * (snap - .235)
  }
  return {
    sourceAt(time, index) {
      const t = wave(time)
      if (t === undefined || t > .17) return
      const along = .12 + index % 13 * .063
      return { x: -1.65 + along * 3.3, y: lineHeight(time, along), z: -.15, floor: .018 }
    },
    pose(time) {
      for (const [index, segment] of rope.entries()) {
        const a = index / rope.length, b = (index + 1) / rope.length
        const rise = lineHeight(time, b) - lineHeight(time, a)
        segment.position.set(-1.65 + 3.3 * (a + b) / 2, (lineHeight(time, a) + lineHeight(time, b)) / 2, -.15)
        segment.rotation.z = Math.atan2(rise, 3.3 / rope.length)
        segment.scaling.x = Math.hypot(3.3 / rope.length, rise) / .28
      }
    },
  }
}

export function bootTrailFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -.079, 0, 4.05, .158, 4.2, water, undefined, false)
  const wood = meshes.paintSurface('wood', '#b99566')
  for (let i = 0; i < 18; i++) meshes.box(0, .033, (i - 8.5) * .23, 1.95, .068, .224, wood)
  const crew = crewAt(meshes, 0, 0, 1)
  const stride = (time: number) => -1.38 + .89 * Math.min(3, time)
  return {
    sourceAt(time) {
      const age = contactAge(time, .34, .49, .09)
      if (age === undefined) return
      const step = Math.floor((time - .34) / .49)
      const side = step % 2 ? -1 : 1
      return { x: .175 * side, y: .074, z: stride(time - age) + .21, yaw: side * .14 }
    },
    pose(time) {
      crew.root.position.set(0, .072, stride(time))
      poseCrew(crew, (Math.min(time, 3) - .34) / .98 + .25, time > 3 ? 0 : .54, false)
    },
  }
}
