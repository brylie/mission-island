import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createFarmTools, poseCrew } from '../assets/crew'
import { createRock } from '../assets/props'
import type { MeshFactory } from '../island-meshes'
import { wingedAnimal } from '../wildlife'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

export function parachutesFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -.035, 0, 4.6, .07, 2.4, '#6b8052').receiveShadows = true
  crewAt(meshes, -1.46, .56, 1)
  for (let i = 0; i < 9; i++) {
    const x = -.37 + i % 3 * .37, z = -.36 + Math.floor(i / 3) * .28
    const height = .59 + .19 * Math.sin(i * 2.4)
    meshes.cylinder(x, height / 2, z, .025, .034, height, 6, '#66794a')
    meshes.sphere(x, height, z, .19, .18, .19, '#e9d9a7', undefined, true, 7)
  }
  return {
    sourceAt(time) {
      if (contactAge(time, .31, .91, .42) !== undefined) {
        return { x: .08 + Math.sin(time * 3.7) * .23, y: .67, z: -.04 }
      }
    },
  }
}

export function fernFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -.044, 0, 4.5, .088, 2.8, '#677853').receiveShadows = true
  const crew = crewAt(meshes, -.78, -.31, 1)
  crew.root.rotation.y = 1.02
  poseCrew(crew, 0, 0, false, undefined, 1)
  const frond = new TransformNode('Brushed frond', meshes.scene)
  for (let index = 0; index < 5; index++) {
    const stem = new TransformNode('Fern stem', meshes.scene)
    stem.parent = index === 0 ? frond : null
    stem.position.set(.04, .035, 0)
    stem.rotation.y = index * Math.PI * .4
    stem.rotation.z = .42 + .15 * (index % 3)
    for (let tier = 0; tier < 6; tier++) {
      const y = .14 + tier * .15
      const width = .43 - tier * .049
      for (const side of [-1, 1]) {
        meshes.sphere(side * width * .38, y, -.022 * tier, width, .075, .15,
          tier % 2 ? '#738f4d' : '#61814d', stem, true, 6).rotation.z = side * .45
      }
    }
    meshes.cylinder(0, .51, -.063, .034, .055, 1.02, 6, '#78904c', stem)
  }
  const tip = new Vector3(-.25, .77, -.11)
  const pulse = (time: number) => contactAge(time, .4, .96, .56)
  function pose(time: number) {
    const t = pulse(time)
    frond.rotation.x = t === undefined ? 0 : -.61 * Math.sin(t * 14) * Math.exp(-t * 4)
    frond.rotation.z = t === undefined ? 0 : Math.sin(t * 12) * .23 * Math.exp(-t * 4)
  }
  return {
    sourceAt(time) {
      const t = pulse(time)
      if (t === undefined || t > .19) return
      pose(time)
      const { x, y, z } = Vector3.TransformCoordinates(tip, frond.computeWorldMatrix(true))
      return { x, y, z, floor: .035 }
    },
    pose,
  }
}

export function hoeFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, .055, .65, 3.1, .11, 2.46, '#946954').receiveShadows = true
  for (const x of [-.9, .67, 1.12]) {
    for (let segment = 0; segment < 12; segment++) {
      const offset = Math.sin(segment * 2.4) * .027
      meshes.sphere(x + offset, .115, -.36 + segment * .17, .22, .08, .25,
        segment % 3 ? '#815544' : '#88614a', undefined, true, 6)
    }
  }
  const crew = crewAt(meshes, .37, -.49)
  const { hoe } = createFarmTools(meshes, crew)
  hoe.setEnabled(true)
  const blade = new Vector3(0, -1, .09)
  function pose(time: number) {
    const beat = (time - .45) * Math.PI * 2 / .89
    poseCrew(crew, 0, 0, false, 'tool')
    crew.arms[0].rotation.x = -.34 - (1 - Math.cos(beat)) * .52
    hoe.rotation.z = -.83
  }
  return {
    sourceAt(time) {
      if (contactAge(time, .41, .89, .14) === undefined) return
      pose(time)
      const { x, y, z } = Vector3.TransformCoordinates(blade, hoe.computeWorldMatrix(true))
      return { x, y: Math.max(.15, y), z, floor: .119 }
    },
    pose,
  }
}

export function chaffFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, -.7, .11)
  crew.root.rotation.y = .62
  poseCrew(crew, 0, 0, false, 'crate')
  const bundle = new TransformNode('Cut barley', meshes.scene)
  for (let index = 0; index < 14; index++) {
    const x = (index % 4 - 1.4) * .075, z = (Math.floor(index / 4) - 1.5) * .069
    const height = .52 + .13 * Math.cos(index * 4)
    meshes.cylinder(x, .03, z, .026, .033, height, 6, '#b79952', bundle)
    meshes.sphere(x, height * .51, z, .075, .177, .082, index % 2 ? '#d8b75d' : '#cda358', bundle)
  }
  meshes.box(0, .015, 0, .32, .08, .31, '#8c6d46', bundle)
  meshes.box(0, -.039, .14, 3.6, .078, 2.8, '#897756').receiveShadows = true
  for (let index = 0; index < 9; index++) {
    const x = 1.16 + .28 * Math.cos(index * 2.4), z = -.52 + Math.cos(index * 1.66) * .51
    meshes.cylinder(x, .18, z, .022, .024, .36, 5, '#a58c4e')
  }
  function sourceAt(time: number) {
    if (contactAge(time, .38, .99, .28) !== undefined) {
      return { x: -.13, y: .94 + .095 * Math.sin(time * 20), z: .55, floor: .02 }
    }
  }
  return {
    sourceAt,
    accents: [{ id: 'chaff-dust', sourceAt }],
    pose(time) {
      bundle.position.set(-.18, .81 + .09 * Math.sin(time * 20), .55)
      bundle.rotation.z = .71 + .29 * Math.sin(time * 14)
    },
  }
}

export function feathersFixture(meshes: MeshFactory): Fixture {
  const bird = wingedAnimal(meshes, '#eae4cd', false)
  bird.root.rotation.y = 1.18
  bird.root.scaling.setAll(1.1)
  const crew = crewAt(meshes, -1.47, -.6, 1)
  crew.root.rotation.y = 1.28
  createRock(meshes, -.22, .3, .83, .68, false)
  return {
    sourceAt(time) {
      if (time >= .35 && time < .55) return { x: -.18 + time - .35, y: .65, z: .28, floor: .048 }
    },
    pose(time) {
      const launch = Math.max(0, Math.min(time - .32, 2.8))
      const flap = launch > 0 ? Math.sin(launch * 19) * .73 : -.75
      bird.root.position.set(-.23 + launch * 1.56, .43 + Math.min(2.15, launch * 1.88), .29 + launch * .2)
      bird.wings[0].rotation.z = flap
      bird.wings[1].rotation.z = -flap
    },
  }
}
