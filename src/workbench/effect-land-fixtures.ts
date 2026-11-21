import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createFarmTools, poseCrew } from '../assets/crew'
import { createRock } from '../assets/props'
import type { MeshFactory } from '../island-meshes'
import { wingedAnimal } from '../wildlife'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

export function parachutesFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -0.035, 0, 4.6, 0.07, 2.4, '#6b8052').receiveShadows = true
  crewAt(meshes, -1.46, 0.56, 1)
  for (let i = 0; i < 9; i++) {
    const x = -0.37 + i % 3 * 0.37, z = -0.36 + Math.floor(i / 3) * 0.28
    const height = 0.59 + 0.19 * Math.sin(i * 2.4)
    meshes.cylinder(x, height / 2, z, 0.025, 0.034, height, 6, '#66794a')
    meshes.sphere(x, height, z, 0.19, 0.18, 0.19, '#e9d9a7', undefined, true, 7)
  }
  return {
    sourceAt(time) {
      if (contactAge(time, 0.31, 0.91, 0.42) !== undefined) {
        return { x: 0.08 + Math.sin(time * 3.7) * 0.23, y: 0.67, z: -0.04 }
      }
    },
  }
}

export function fernFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -0.044, 0, 4.5, 0.088, 2.8, '#677853').receiveShadows = true
  const crew = crewAt(meshes, -0.78, -0.31, 1)
  crew.root.rotation.y = 1.02
  poseCrew(crew, 0, 0, false, undefined, 1)
  const frond = new TransformNode('Brushed frond', meshes.scene)
  for (let index = 0; index < 5; index++) {
    const stem = new TransformNode('Fern stem', meshes.scene)
    stem.parent = index === 0 ? frond : null
    stem.position.set(0.04, 0.035, 0)
    stem.rotation.y = index * Math.PI * 0.4
    stem.rotation.z = 0.42 + 0.15 * (index % 3)
    for (let tier = 0; tier < 6; tier++) {
      const y = 0.14 + tier * 0.15
      const width = 0.43 - tier * 0.049
      for (const side of [-1, 1]) {
        meshes.sphere(side * width * 0.38, y, -0.022 * tier, width, 0.075, 0.15, tier % 2 ? '#738f4d' : '#61814d', stem, true, 6).rotation.z = side * 0.45
      }
    }
    meshes.cylinder(0, 0.51, -0.063, 0.034, 0.055, 1.02, 6, '#78904c', stem)
  }
  const tip = new Vector3(-0.25, 0.77, -0.11)
  const pulse = (time: number) => contactAge(time, 0.4, 0.96, 0.56)
  function pose(time: number) {
    const t = pulse(time)
    frond.rotation.x = t === undefined ? 0 : -0.61 * Math.sin(t * 14) * Math.exp(-t * 4)
    frond.rotation.z = t === undefined ? 0 : Math.sin(t * 12) * 0.23 * Math.exp(-t * 4)
  }
  return {
    sourceAt(time) {
      const t = pulse(time)
      if (t === undefined || t > 0.19) return
      pose(time)
      const { x, y, z } = Vector3.TransformCoordinates(tip, frond.computeWorldMatrix(true))
      return { x, y, z, floor: 0.035 }
    },
    pose,
  }
}

export function hoeFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, 0.055, 0.65, 3.1, 0.11, 2.46, '#946954').receiveShadows = true
  for (const x of [-0.9, 0.67, 1.12]) {
    for (let segment = 0; segment < 12; segment++) {
      const offset = Math.sin(segment * 2.4) * 0.027
      meshes.sphere(x + offset, 0.115, -0.36 + segment * 0.17, 0.22, 0.08, 0.25, segment % 3 ? '#815544' : '#88614a', undefined, true, 6)
    }
  }
  const crew = crewAt(meshes, 0.37, -0.49)
  const { hoe } = createFarmTools(meshes, crew)
  hoe.setEnabled(true)
  const blade = new Vector3(0, -1, 0.09)
  function pose(time: number) {
    const beat = (time - 0.45) * Math.PI * 2 / 0.89
    poseCrew(crew, 0, 0, false, 'tool')
    crew.arms[0].rotation.x = -0.34 - (1 - Math.cos(beat)) * 0.52
    hoe.rotation.z = -0.83
  }
  return {
    sourceAt(time) {
      if (contactAge(time, 0.41, 0.89, 0.14) === undefined) return
      pose(time)
      const { x, y, z } = Vector3.TransformCoordinates(blade, hoe.computeWorldMatrix(true))
      return { x, y: Math.max(0.15, y), z, floor: 0.119 }
    },
    pose,
  }
}

export function chaffFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, -0.7, 0.11)
  crew.root.rotation.y = 0.62
  poseCrew(crew, 0, 0, false, 'crate')
  const bundle = new TransformNode('Cut barley', meshes.scene)
  for (let index = 0; index < 14; index++) {
    const x = (index % 4 - 1.4) * 0.075, z = (Math.floor(index / 4) - 1.5) * 0.069
    const height = 0.52 + 0.13 * Math.cos(index * 4)
    meshes.cylinder(x, 0.03, z, 0.026, 0.033, height, 6, '#b79952', bundle)
    meshes.sphere(x, height * 0.51, z, 0.075, 0.177, 0.082, index % 2 ? '#d8b75d' : '#cda358', bundle)
  }
  meshes.box(0, 0.015, 0, 0.32, 0.08, 0.31, '#8c6d46', bundle)
  meshes.box(0, -0.039, 0.14, 3.6, 0.078, 2.8, '#897756').receiveShadows = true
  for (let index = 0; index < 9; index++) {
    const x = 1.16 + 0.28 * Math.cos(index * 2.4), z = -0.52 + Math.cos(index * 1.66) * 0.51
    meshes.cylinder(x, 0.18, z, 0.022, 0.024, 0.36, 5, '#a58c4e')
  }
  function sourceAt(time: number) {
    if (contactAge(time, 0.38, 0.99, 0.28) !== undefined) {
      return { x: -0.13, y: 0.94 + 0.095 * Math.sin(time * 20), z: 0.55, floor: 0.02 }
    }
  }
  return {
    sourceAt,
    accents: [{ id: 'chaff-dust', sourceAt }],
    pose(time) {
      bundle.position.set(-0.18, 0.81 + 0.09 * Math.sin(time * 20), 0.55)
      bundle.rotation.z = 0.71 + 0.29 * Math.sin(time * 14)
    },
  }
}

export function feathersFixture(meshes: MeshFactory): Fixture {
  const bird = wingedAnimal(meshes, '#eae4cd', false)
  bird.root.rotation.y = 1.18
  bird.root.scaling.setAll(1.1)
  const crew = crewAt(meshes, -1.47, -0.6, 1)
  crew.root.rotation.y = 1.28
  createRock(meshes, -0.22, 0.3, 0.83, 0.68, false)
  return {
    sourceAt(time) {
      if (time >= 0.35 && time < 0.55) return { x: -0.18 + time - 0.35, y: 0.65, z: 0.28, floor: 0.048 }
    },
    pose(time) {
      const launch = Math.max(0, Math.min(time - 0.32, 2.8))
      const flap = launch > 0 ? Math.sin(launch * 19) * 0.73 : -0.75
      bird.root.position.set(-0.23 + launch * 1.56, 0.43 + Math.min(2.15, launch * 1.88), 0.29 + launch * 0.2)
      bird.wings[0].rotation.z = flap
      bird.wings[1].rotation.z = -flap
    },
  }
}
