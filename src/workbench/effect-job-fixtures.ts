import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createFarmTools, poseCrew } from '../assets/crew'
import { createSupply } from '../assets/props'
import type { MeshFactory } from '../island-meshes'
import { crateSize } from '../world'
import { contactAge, crewAt, fireBed, type Fixture } from './effect-fixtures'

export function wateringFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, .48, -.92, 1)
  const { can } = createFarmTools(meshes, crew)
  can.setEnabled(true)
  const rose = new Vector3(0, -.13, .54)
  const soil = meshes.paintSurface('gravel', '#745540')
  meshes.box(0, .046, .98, 2.3, .092, 2.57, soil).receiveShadows = true
  for (const x of [-.88, .51, .92]) {
    for (const z of [.25, .89, 1.53, 2.08]) {
      const leaf = meshes.sphere(x, .18, z, .19, .2, .175, '#7d9c59')
      leaf.rotation.z = .32
    }
  }
  function pose(time: number) {
    poseCrew(crew, 0, 0, false, 'tool', .43)
    can.rotation.x = .44 + Math.sin(time * 3) * .16
    can.rotation.y = Math.sin(time * 2.65) * .24
  }
  return {
    sourceAt(time) {
      pose(time)
      const matrix = can.computeWorldMatrix(true)
      const { x, y, z } = Vector3.TransformCoordinates(rose, matrix)
      const aim = Vector3.TransformNormal(Vector3.Forward(), matrix)
      return { x, y, z, yaw: Math.atan2(aim.x, aim.z), floor: .1 }
    },
    accents: [{ id: 'garden-splashes', sourceAt: time => {
      if (time >= .61) return { x: .09 + Math.sin((time - .3) * 2.65) * .33, y: .109, z: 1.03 }
    } }],
    pose,
  }
}

export function sawdustFixture(meshes: MeshFactory): Fixture {
  const wood = meshes.paintSurface('wood', '#a07e54')
  meshes.box(0, .84, .02, 2.42, .135, 1.16, wood)
  for (const x of [-.96, .96]) {
    for (const z of [-.4, .43]) meshes.box(x, .404, z, .135, .81, .15, '#746650')
  }
  meshes.box(-.52, .952, 0, 1.18, .09, .37, '#cdab74')
  const arbor = new TransformNode('Saw arbor', meshes.scene)
  arbor.position.set(.08, 1.01, -.018)
  meshes.cylinder(0, 0, 0, .48, .48, .053, 22, '#a2b5b1', arbor).rotation.x = Math.PI / 2
  for (let tooth = 0; tooth < 14; tooth++) {
    const angle = tooth * Math.PI * 2 / 14
    const edge = meshes.box(.247 * Math.sin(angle), .247 * Math.cos(angle), 0,
      .049, .079, .058, '#98a5a0', arbor)
    edge.rotation.z = -angle - .23
  }
  meshes.box(.079, .158, .029, .035, .061, .008, '#556c69', arbor, false).name = 'Blade witness mark'
  crewAt(meshes, -1.12, -.69)
  const source = { x: .1, y: 1.12, z: .025, floor: .035 }
  const sourceAt = (time: number) => contactAge(time, .3, 1.03, .56) === undefined ? undefined : source
  return {
    sourceAt,
    accents: [{ id: 'mill-dust', sourceAt }],
    pose(time) {
      // The cutting edge moves toward +X where it meets the stock and throws sawdust.
      arbor.rotation.z = -time * 12
    },
  }
}

export function crateGritFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, -.8, -.86)
  crew.root.rotation.y = -.11
  poseCrew(crew, 0, 0, false, 'crate')
  const crate = createSupply(meshes, 'crate')
  crate.position.x = -.76
  crate.position.z = -.04
  meshes.box(0, -.083, 0, 4.5, .166, 2.65, meshes.paintSurface('gravel', '#a48a66')).receiveShadows = true
  const at = [.47, 1.52, 2.59]
  function sourceAt(time: number, index: number) {
    const contact = at.findIndex(start => time >= start && time < start + .13)
    if (contact < 0) return
    const x = index % 2 ? 1 : -1, z = index % 4 < 2 ? 1 : -1
    return { x: crate.position.x + .43 * x, y: .044, z: crate.position.z + .41 * z,
      yaw: Math.atan2(x, z), speed: [.59, 1, 1.23][contact], floor: .024 }
  }
  return {
    sourceAt,
    accents: [{ id: 'crate-grains', sourceAt }],
    pose(time) {
      const landing = at.find(t => time <= t + .19)
      const rest = crateSize / 2 + .022
      const offset = landing === undefined ? 0 : time < landing
        ? Math.min(.67, (landing - time) * 1.15)
        : Math.sin((time - landing) / .19 * Math.PI) * .079
      crate.position.y = rest + offset
    },
  }
}

export function ashFixture(meshes: MeshFactory): Fixture {
  fireBed(meshes)
  const soot = meshes.cylinder(0, .019, 0, 1.52, 1.52, .039, 14, '#484846', undefined, false)
  soot.scaling.z = .67
  const crew = crewAt(meshes, .47, -1.68, 1)
  poseCrew(crew, 0, 0, false, 'extinguisher', 1)
  const tool = createSupply(meshes, 'extinguisher')
  tool.position.set(0, .24, -1.14)
  return {
    accents: [{ id: 'fading-embers', sourceAt: time => {
      if (time < .6) return { x: 0, y: .27, z: 0, floor: .08 }
    } }],
    sourceAt(time) {
      if (time < .59) return
      const patch = Math.sin(time * 3.5)
      return { x: patch * .39, y: .27, z: Math.sin(time * 2.1) * .2,
        speed: 1.12 - Math.min(time, 3) * .17 }
    },
  }
}

export function ferrySparksFixture(meshes: MeshFactory): Fixture {
  const wood = meshes.paintSurface('wood', '#776353')
  const steel = meshes.paintSurface('metal', '#5b7578')
  for (let index = 0; index < 10; index++) {
    meshes.box(0, -.042, (index - 4) * .32, 4.85, .08, .306, wood).receiveShadows = true
  }
  meshes.box(-.64, .47, -.5, 2.33, .94, .14, steel)
  meshes.box(-.08, .56, -.416, .116, .81, .09, '#7a8b82')
  meshes.box(-.08, .56, -.354, .039, .2, .037, '#b0b8a1', undefined, false)
  const crew = crewAt(meshes, -.87, .17)
  crew.root.rotation.y = .83
  poseCrew(crew, 0, 0, false, 'tool', 1)
  return {
    sourceAt(time) {
      const weld = contactAge(time, .33, .69, .21)
      if (weld !== undefined) return { x: -.078, y: .66 - weld * .25, z: -.323, floor: .012 }
    },
  }
}
