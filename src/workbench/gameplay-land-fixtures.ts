import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { poseCrew } from '../assets/crew'
import { createProduceCarrot } from '../assets/effect-props'
import { createRock } from '../assets/props'
import type { MeshFactory } from '../island-meshes'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

export function carrotPullFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, -.68, -.47)
  crew.root.rotation.y = .83
  const bed = meshes.box(0, .04, .28, 2.22, .093, 1.53, '#8d6450')
  bed.receiveShadows = true
  for (const x of [-.73, 0, .73]) {
    meshes.box(x, .087, .29, .3, .028, 1.27, '#77533e')
    for (const z of [-.07, .3, .67]) {
      const plant = new TransformNode('Carrot in row', meshes.scene)
      plant.position.set(x, .073, z)
      createProduceCarrot(meshes, plant)
    }
  }
  const carrot = new TransformNode('Lifted carrot', meshes.scene)
  createProduceCarrot(meshes, carrot)
  const pullAge = (time: number) => contactAge(time, .43, 1.02, .53) ?? 0
  function lift(time: number) {
    return .11 + .98 * Math.sin(pullAge(time) / .53 * Math.PI) ** .74
  }
  return {
    sourceAt(time) {
      const t = contactAge(time, .51, 1.02, .15)
      if (t !== undefined) return { x: -.3 + t * .37, y: Math.max(.135, lift(time) - .16), z: .06, floor: .107 }
    },
    pose(time) {
      const height = lift(time)
      carrot.position.set(-.32 + pullAge(time) * .35, height, .055)
      carrot.rotation.z = -.29 * Math.sin(pullAge(time) * 5)
      crew.arms[0].rotation.x = -.5 - .85 * height
    },
  }
}

export function hiveTrafficFixture(meshes: MeshFactory): Fixture {
  const wood = meshes.paintSurface('wood', '#cda974')
  meshes.box(0, .18, 0, 1.22, .112, .88, '#84765a')
  for (const x of [-.47, .47]) meshes.box(x, .098, 0, .095, .193, .61, '#7b6a51')
  for (const y of [.335, .525, .715]) meshes.box(0, y, 0, .97, .179, .72, wood)
  meshes.box(0, .843, 0, 1.08, .086, .842, '#849087')
  meshes.box(0, .28, .438, .84, .049, .31, '#d6b181')
  meshes.box(0, .337, .367, .67, .047, .017, '#514737')
  crewAt(meshes, -1.25, -.42, 1)
  return {
    sourceAt(time, index) {
      const inward = index % 5 === 0 || index % 5 === 1
      const distance = inward ? .86 + (index % 4) * .18 : 0
      return { x: (index % 7 - 3) * .093, y: .357 + distance * .28, z: .41 + distance,
        yaw: inward ? Math.PI + Math.sin(time * 5) * .09 : 0, pitch: inward ? -.21 : .05,
        speed: inward ? 1.43 : 1, floor: .22 }
    },
  }
}

export function cloverStepFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -.039, 0, 4.25, .078, 2.5, '#698557').receiveShadows = true
  const crew = crewAt(meshes, 0, 0, 1)
  for (let i = 0; i < 25; i++) {
    const x = -.93 + (i % 5) * .17 + Math.sin(i * 8) * .072
    const z = -.94 + Math.floor(i / 5) * .43 + Math.sin(i * 3) * .094
    const y = .18 + (i % 3) * .061
    meshes.cylinder(x, y / 2, z, .014, .02, y, 5, '#627b4a')
    meshes.sphere(x, y, z, .096, .077, .093, i % 3 ? '#e8d5d0' : '#d8a1aa', undefined, true, 6)
    for (const side of [-1, 1]) meshes.sphere(x + side * .047, y * .48, z, .11, .034, .065, '#799450')
  }
  const path = (time: number) => -1.27 + Math.min(3.05, time) * .74
  return {
    sourceAt(time) {
      const t = contactAge(time, .407, .56, .14)
      if (t !== undefined) return { x: -.48, y: .245, z: path(time - t) + .23, floor: .037 }
    },
    pose(time) {
      crew.root.position.set(-.23, 0, path(time))
      crew.root.rotation.y = -.15
      poseCrew(crew, (Math.min(time, 3.05) - .407) / 1.12 + .25, time < 3.05 ? .47 : 0, false)
    },
  }
}

export function slateFixture(meshes: MeshFactory): Fixture {
  const slope = meshes.box(-.31, .41, -.25, 1.83, .21, 2.8, '#707d82')
  slope.rotation.x = .26
  meshes.box(-.27, -.04, 0, 4.2, .085, 4.35, '#637075').receiveShadows = true
  for (let i = 0; i < 8; i++) {
    const z = -.9 + i * .285
    const slab = meshes.box(-.61 + Math.sin(i * 2.2) * .46, .52 - (z + .25) * .26, z, .48, .11, .38,
      i % 2 ? '#7c8d93' : '#62747c')
    slab.rotation.set(.26, i * .92, -.11)
  }
  createRock(meshes, -1.53, .98, .78, .93, false)
  crewAt(meshes, 1.11, .35, 1)
  return {
    sourceAt(time, index) {
      const release = contactAge(time, .33, .94, .23)
      if (release !== undefined) return { x: -.46 + (index % 4) * .18, y: .57, z: .18 + release * .65, floor: .047 }
    },
  }
}

export function hedgeFixture(meshes: MeshFactory): Fixture {
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * .46
    meshes.sphere(x, .76 + .095 * Math.cos(i * 3), .32, .78, 1.34, 1.02,
      i % 2 ? '#66854d' : '#527343', undefined, true, 8)
  }
  const crew = crewAt(meshes, -.54, 1.27)
  crew.root.rotation.y = Math.PI
  poseCrew(crew, 0, 0, false, 'tool', 1, 1, 0, false, true)
  const pivot = new TransformNode('Hedge shears', meshes.scene)
  const blades = [-1, 1].map(side => {
    const pivotSide = new TransformNode('Shear handle and blade', meshes.scene)
    pivotSide.parent = pivot
    meshes.box(0, 0, -.219, .059, .052, .438, '#98835f', pivotSide)
    meshes.box(0, 0, .158, .081, .027, .327, '#a0ada4', pivotSide)
    return { side, pivotSide }
  })
  const clip = (time: number) => contactAge(time, .43, .71, .33) ?? .33
  return {
    sourceAt(time) {
      if (contactAge(time, .41, .71, .14) !== undefined) {
        return { x: -.47 + .22 * Math.sin(time * 3), y: 1.26, z: .7, floor: .055 }
      }
    },
    pose(time) {
      pivot.position.set(-.47 + .22 * Math.sin(time * 3), 1.26, .78)
      pivot.rotation.y = Math.PI
      const opening = .095 + Math.sin(clip(time) / .33 * Math.PI) * .38
      for (const { side, pivotSide } of blades) pivotSide.rotation.y = side * opening
    },
  }
}
