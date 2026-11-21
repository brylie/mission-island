import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { createFarmTools, poseCrew } from '../assets/crew'
import { createTimberSaw } from '../assets/effect-props'
import { createSupply } from '../assets/props'
import type { MeshFactory } from '../island-meshes'
import { crateSize } from '../world'
import { contactAge, crewAt, fireBed, type Fixture } from './effect-fixtures'

export function wateringFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, 0.48, -0.92, 1)
  const { can } = createFarmTools(meshes, crew)
  can.setEnabled(true)
  const rose = new Vector3(0, -0.13, 0.54)
  const soil = meshes.paintSurface('gravel', '#745540')
  meshes.box(0, 0.046, 0.98, 2.3, 0.092, 2.57, soil).receiveShadows = true
  for (const x of [-0.88, 0.51, 0.92]) {
    for (const z of [0.25, 0.89, 1.53, 2.08]) {
      const leaf = meshes.sphere(x, 0.18, z, 0.19, 0.2, 0.175, '#7d9c59')
      leaf.rotation.z = 0.32
    }
  }
  function pose(time: number) {
    poseCrew(crew, 0, 0, false, 'tool', 0.43)
    can.rotation.x = 0.44 + Math.sin(time * 3) * 0.16
    can.rotation.y = Math.sin(time * 2.65) * 0.24
  }
  return {
    sourceAt(time) {
      pose(time)
      const matrix = can.computeWorldMatrix(true)
      const { x, y, z } = Vector3.TransformCoordinates(rose, matrix)
      const aim = Vector3.TransformNormal(Vector3.Forward(), matrix)
      return { x, y, z, yaw: Math.atan2(aim.x, aim.z), floor: 0.1 }
    },
    accents: [{ id: 'garden-splashes', sourceAt: (time) => {
      if (time >= 0.61) return { x: 0.09 + Math.sin((time - 0.3) * 2.65) * 0.33, y: 0.109, z: 1.03 }
    } }],
    pose,
  }
}

export function sawdustFixture(meshes: MeshFactory): Fixture {
  const saw = createTimberSaw(meshes)
  crewAt(meshes, -1.12, -0.69)
  const source = { x: 0.1, y: 1.12, z: 0.025, floor: 0.035 }
  const sourceAt = (time: number) => contactAge(time, 0.3, 1.03, 0.56) === undefined ? undefined : source
  return {
    sourceAt,
    accents: [{ id: 'mill-dust', sourceAt }],
    pose: saw.pose,
  }
}

export function crateGritFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, -0.8, -0.86)
  crew.root.rotation.y = -0.11
  poseCrew(crew, 0, 0, false, 'crate')
  const crate = createSupply(meshes, 'crate')
  crate.position.x = -0.76
  crate.position.z = -0.04
  meshes.box(0, -0.083, 0, 4.5, 0.166, 2.65, meshes.paintSurface('gravel', '#a48a66')).receiveShadows = true
  const at = [0.47, 1.52, 2.59]
  function sourceAt(time: number, index: number) {
    const contact = at.findIndex((start) => time >= start && time < start + 0.13)
    if (contact < 0) return
    const x = index % 2 ? 1 : -1, z = index % 4 < 2 ? 1 : -1
    return { x: crate.position.x + 0.43 * x, y: 0.044, z: crate.position.z + 0.41 * z, yaw: Math.atan2(x, z), speed: [0.59, 1, 1.23][contact], floor: 0.024 }
  }
  return {
    sourceAt,
    accents: [{ id: 'crate-grains', sourceAt }],
    pose(time) {
      const landing = at.find((t) => time <= t + 0.19)
      const rest = crateSize / 2 + 0.022
      const offset = landing === undefined
        ? 0
        : time < landing
          ? Math.min(0.67, (landing - time) * 1.15)
          : Math.sin((time - landing) / 0.19 * Math.PI) * 0.079
      crate.position.y = rest + offset
    },
  }
}

export function ashFixture(meshes: MeshFactory): Fixture {
  fireBed(meshes)
  const soot = meshes.cylinder(0, 0.019, 0, 1.52, 1.52, 0.039, 14, '#484846', undefined, false)
  soot.scaling.z = 0.67
  const crew = crewAt(meshes, 0.47, -1.68, 1)
  poseCrew(crew, 0, 0, false, 'extinguisher', 1)
  const tool = createSupply(meshes, 'extinguisher')
  tool.position.set(0, 0.24, -1.14)
  return {
    accents: [{ id: 'fading-embers', sourceAt: (time) => {
      if (time < 0.6) return { x: 0, y: 0.27, z: 0, floor: 0.08 }
    } }],
    sourceAt(time) {
      if (time < 0.59) return
      const patch = Math.sin(time * 3.5)
      return { x: patch * 0.39, y: 0.27, z: Math.sin(time * 2.1) * 0.2, speed: 1.12 - Math.min(time, 3) * 0.17 }
    },
  }
}

export function ferrySparksFixture(meshes: MeshFactory): Fixture {
  const wood = meshes.paintSurface('wood', '#776353')
  const steel = meshes.paintSurface('metal', '#5b7578')
  for (let index = 0; index < 10; index++) {
    meshes.box(0, -0.042, (index - 4) * 0.32, 4.85, 0.08, 0.306, wood).receiveShadows = true
  }
  meshes.box(-0.64, 0.47, -0.5, 2.33, 0.94, 0.14, steel)
  meshes.box(-0.08, 0.56, -0.416, 0.116, 0.81, 0.09, '#7a8b82')
  meshes.box(-0.08, 0.56, -0.354, 0.039, 0.2, 0.037, '#b0b8a1', undefined, false)
  const crew = crewAt(meshes, -0.87, 0.17)
  crew.root.rotation.y = 0.83
  poseCrew(crew, 0, 0, false, 'tool', 1)
  return {
    sourceAt(time) {
      const weld = contactAge(time, 0.33, 0.69, 0.21)
      if (weld !== undefined) return { x: -0.078, y: 0.66 - weld * 0.25, z: -0.323, floor: 0.012 }
    },
  }
}
