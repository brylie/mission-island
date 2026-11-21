import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { poseCrew } from '../assets/crew'
import { createProduceCarrot } from '../assets/effect-props'
import { createFlatbed, poseFlatbed } from '../assets/flatbed'
import { createSupply } from '../assets/props'
import type { MeshFactory } from '../island-meshes'
import { flatbedGroundDrive } from '../vehicles/flatbed'
import { crateSize, truckBed } from '../world'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

export function brakeChipsFixture(meshes: MeshFactory): Fixture {
  const truck = createFlatbed(meshes)
  meshes.box(0, -0.047, 0, 4.9, 0.092, 8.8, meshes.paintSurface('gravel', '#9d9079')).receiveShadows = true
  const travel = (time: number) => -1.96 + 2.85 * (1 - Math.exp(-2.2 * time))
  return {
    sourceAt(time, index) {
      if (index % 4 === 3 || time < 0.52 || time > 1.3) return
      const side = index % 3 ? 1 : -1
      const { halfTrack, axles } = flatbedGroundDrive.wheels
      return { x: side * (halfTrack + 0.106), y: 0.059, z: travel(time) + axles[1] - 0.11, yaw: side * 0.41, speed: 1.33 - time * 0.36, floor: 0.023 }
    },
    pose(time) {
      truck.root.position.set(0, 0, travel(time))
      truck.root.rotation.x = -0.044 * Math.exp(-Math.pow((time - 0.61) * 4.3, 2))
      poseFlatbed(truck, travel(time) / flatbedGroundDrive.wheels.radius, 0.033)
    },
  }
}

export function grainSpillFixture(meshes: MeshFactory): Fixture {
  const truck = createFlatbed(meshes)
  truck.root.position.set(0, 0, 1.28)
  const sack = new TransformNode('Tipped grain sack', meshes.scene)
  meshes.sphere(0, 0.274, 0, 0.64, 0.73, 0.49, '#b89e73', sack, true, 8)
  meshes.cylinder(0, 0.598, 0, 0.256, 0.37, 0.134, 9, '#b29a70', sack)
  const top = meshes.cylinder(0, 0.672, 0, 0.186, 0.185, 0.017, 8, '#826740', sack)
  top.receiveShadows = true
  const crew = crewAt(meshes, 1.18, -1.32, 1)
  crew.root.rotation.y = -1.45
  poseCrew(crew, 0, 0, false, 'crate')
  meshes.box(0, -0.041, -1.36, 4.65, 0.082, 3.35, '#7c7664').receiveShadows = true
  const tip = (time: number) => -0.48 - Math.min(1, time / 0.91) * 1.2
  return {
    sourceAt(time) {
      if (time > 0.84 && time < 2.62) {
        const tilt = tip(time)
        return { x: 0.17, y: truckBed.top + 0.12 + Math.cos(tilt) * 0.66, z: -1.35 + Math.sin(tilt) * 0.66, yaw: Math.PI, speed: 1.3 - time * 0.19, floor: 0.026 }
      }
    },
    pose(time) {
      sack.position.set(0.17, truckBed.top + 0.12, -1.35)
      sack.rotation.x = tip(time)
    },
  }
}

export function hoistFixture(meshes: MeshFactory): Fixture {
  const crate = createSupply(meshes, 'crate')
  const hook = new TransformNode('Hoist hook', meshes.scene)
  meshes.cylinder(0, 0.03, 0, 0.055, 0.061, 0.13, 8, '#7f8580', hook)
  meshes.box(0.047, -0.02, 0, 0.143, 0.048, 0.062, '#737b78', hook).rotation.z = 0.28
  for (const x of [-1.65, 1.65]) meshes.box(x, 1.38, -0.24, 0.18, 2.76, 0.2, '#727d78')
  meshes.box(0, 2.76, -0.24, 3.52, 0.17, 0.265, '#89948c')
  const chain = Array.from({ length: 15 }, (_, i) => {
    const link = meshes.sphere(0, 0, 0, i % 2 ? 0.068 : 0.091, 0.118, i % 2 ? 0.09 : 0.064, '#737d78', undefined, false)
    link.name = 'Chain link'
    return link
  })
  const crew = crewAt(meshes, 1.11, 0.5)
  crew.root.rotation.y = -1.96
  const lift = (time: number) => 0.02 + 0.92 * Math.max(0, 1 - Math.exp(-1.8 * (time - 0.42)))
  return {
    sourceAt(time, index) {
      if (contactAge(time, 0.46, 0.78, 0.16) === undefined) return
      return { x: 0.02 * Math.sin(time * 14), y: Math.min(2.52, 1.3 + lift(time) + (index % 4) * 0.1), z: -0.24, floor: 0.026 }
    },
    pose(time) {
      crate.position.set(0, crateSize / 2 + lift(time), -0.24)
      hook.position.set(0, crateSize + lift(time) + 0.066, -0.24)
      for (const [index, link] of chain.entries()) {
        const fraction = (index + 0.5) / chain.length
        const y = hook.position.y + (2.68 - hook.position.y) * fraction
        link.position.set(Math.sin(time * 18 - fraction * 10) * (1 - fraction) * 0.021, y, -0.24)
        link.scaling.y = Math.max(0.041, (2.68 - hook.position.y) / chain.length + 0.009)
      }
    },
  }
}

export function washFixture(meshes: MeshFactory): Fixture {
  const basin = meshes.paintSurface('metal', '#718a87')
  meshes.box(0, 0.78, 0, 1.86, 0.153, 0.97, basin)
  for (const x of [-0.86, 0.86]) {
    for (const z of [-0.47, 0.47]) meshes.box(x, 0.846, z, 0.086, 0.194, 0.077, basin)
    meshes.box(x, 0.351, 0.09, 0.125, 0.702, 0.36, '#696f65')
  }
  for (const z of [-0.437, 0.437]) meshes.box(0, 0.883, z, 1.84, 0.12, 0.082, basin)
  meshes.box(0, 0.875, 0, 1.62, 0.037, 0.78, '#548883', undefined, false)
  const crew = crewAt(meshes, 0.19, -0.832, 1)
  poseCrew(crew, 0, 0, false, 'tool', 1, 1, 0, false, true)
  for (let i = 0; i < 5; i++) {
    const carrot = new TransformNode('Produce in rinsing trough', meshes.scene)
    carrot.position.set(0.39 - i * 0.165, 0.923, 0.057 + Math.sin(i * 3) * 0.123)
    carrot.rotation.set(1.31, i * 1.7, -0.17)
    createProduceCarrot(meshes, carrot)
  }
  return {
    sourceAt(time) {
      if (contactAge(time, 0.33, 0.77, 0.44) !== undefined) {
        return { x: Math.sin(time * 4) * 0.32, y: 0.969, z: 0.082, floor: 0.9 }
      }
    },
    pose(time) {
      crew.arms[0].rotation.x = -1.53 + Math.sin(time * 10.5) * 0.085
      crew.arms[1].rotation.x = -1.41 - Math.sin(time * 10.5) * 0.115
    },
  }
}

export function chalkFixture(meshes: MeshFactory): Fixture {
  const wood = meshes.paintSurface('wood', '#8d725a')
  for (let i = 0; i < 11; i++) meshes.box(0, -0.045, (i - 5) * 0.29, 4.3, 0.09, 0.278, wood).receiveShadows = true
  const left = crewAt(meshes, -1.73, -0.33)
  const right = crewAt(meshes, 1.7, -0.33, 1)
  left.root.rotation.y = 1.15
  right.root.rotation.y = -1.13
  poseCrew(left, 0, 0, false, 'tool', 1)
  poseCrew(right, 0, 0, false, 'tool', 1)
  const cords = Array.from({ length: 14 }, () => meshes.box(0, 0, 0, 0.22, 0.022, 0.021, '#85b3be', undefined, false))
  const mark = meshes.box(0, 0.008, 0.16, 2.95, 0.005, 0.027, '#729eac', undefined, false)
  const snap = (time: number) => contactAge(time, 0.61, 0.91, 0.27) ?? 0.27
  function cordHeight(time: number, u: number) {
    const age = snap(time)
    return 0.039 + Math.abs(Math.sin(age * 18)) * Math.exp(-age * 10) * Math.sin(u * Math.PI) * 0.23
  }
  return {
    sourceAt(time, index) {
      const t = contactAge(time, 0.61, 0.91, 0.087)
      if (t !== undefined) return { x: (index % 24 - 11.5) * 0.121, y: 0.034, z: 0.16, floor: 0.01 }
    },
    pose(time) {
      mark.visibility = time < 0.61 ? 0 : 0.76
      for (const [index, cord] of cords.entries()) {
        const a = index / cords.length, b = (index + 1) / cords.length
        const start = cordHeight(time, a), end = cordHeight(time, b)
        cord.position.set(-1.48 + (a + b) * 1.48, (start + end) / 2, 0.16)
        cord.rotation.z = Math.atan2(end - start, 2.96 / cords.length)
      }
    },
  }
}
