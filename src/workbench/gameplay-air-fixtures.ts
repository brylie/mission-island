import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createOilLantern } from '../assets/effect-props'
import { createRock } from '../assets/props'
import type { MeshFactory } from '../island-meshes'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

function lanternStand(meshes: MeshFactory, height: number) {
  const lantern = createOilLantern(meshes)
  lantern.root.position.y = height
  for (const x of [-.38, .38]) {
    for (const z of [-.22, .22]) meshes.box(x, height / 2, z, .085, height, .09, '#6a5c49')
  }
  meshes.box(0, height - .037, 0, .98, .073, .63, '#9e815f')
  return lantern
}

export function mothFixture(meshes: MeshFactory): Fixture {
  const height = .94
  const lamp = lanternStand(meshes, height)
  const crew = crewAt(meshes, -1.2, -.51, 1)
  crew.root.rotation.y = 1.17
  const y = height + .26
  return {
    sourceAt(time, index) {
      const angle = time * 4.9 + index * 1.38
      const ray = .29 + (index % 5) * .107
      return { x: Math.cos(angle) * ray, y, z: Math.sin(angle) * ray,
        orbit: { x: 0, z: 0, angularSpeed: index % 3 ? 3.8 : -2.15, peelAfter: 1.45 } }
    },
    pose(time) {
      lamp.flame.scaling.y = .13 + .022 * Math.sin(time * 12)
    },
  }
}

export function ventFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, .66, -.57, 2.7, 1.32, 1.37, '#6d766d')
  meshes.box(0, 1.34, -.55, 2.95, .14, 1.54, '#486360')
  meshes.cylinder(.03, 1.52, -.23, .27, .29, .4, 9, '#8a9990')
  meshes.cylinder(.03, 1.728, -.23, .22, .22, .02, 9, '#405352')
  crewAt(meshes, -1.71, .42)
  return {
    sourceAt(time) {
      if (contactAge(time, .25, 1.1, .74) !== undefined) return { x: .03, y: 1.74, z: -.23 }
    },
  }
}

export function gateFrostFixture(meshes: MeshFactory): Fixture {
  const gate = new TransformNode('Frosted gate', meshes.scene)
  gate.position.set(-1.05, 0, -.13)
  const wood = '#817861', frost = '#c5d6cb'
  for (const x of [-1.09, 1.09]) {
    meshes.box(x, .64, -.13, .135, 1.28, .16, wood)
    meshes.box(x, 1.29, -.13, .146, .025, .17, frost)
  }
  for (const y of [.37, .95]) meshes.box(1.02, y, 0, 1.96, .122, .087, wood, gate)
  for (let i = 0; i < 7; i++) {
    const x = .17 + i * .283
    meshes.box(x, .64, .012, .124, .83, .077, wood, gate)
    meshes.box(x, 1.062, .012, .131, .024, .088, frost, gate)
  }
  const crew = crewAt(meshes, 1.31, .72, 1)
  crew.root.rotation.y = -2.7
  const angle = (time: number) => .61 * Math.sin(Math.min(time, 3) * Math.PI / 3)
  return {
    sourceAt(time, index) {
      if (contactAge(time, .4, 1.05, .16) === undefined) return
      const arm = .62 + index % 7 * .19
      const yaw = angle(time)
      return { x: -1.05 + arm * Math.cos(yaw), z: -.13 - arm * Math.sin(yaw), y: 1.076, yaw, floor: .015 }
    },
    pose(time) {
      gate.rotation.y = angle(time)
    },
  }
}

export function canvasRunoffFixture(meshes: MeshFactory): Fixture {
  for (const x of [-1.25, 1.25]) meshes.cylinder(x, 1.02, -.38, .085, .097, 2.04, 7, '#7a7159')
  const tarp = meshes.paint('#57837b')
  tarp.backFaceCulling = false
  const edge: number[] = [], indices: number[] = []
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * .46, lift = .085 * Math.abs(i - 3)
    edge.push(x, 2.04 + lift, -.96, x, 1.64 + lift, .58)
    const n = i * 2
    if (i) indices.push(n - 2, n, n + 1, n - 2, n + 1, n - 1)
  }
  meshes.surface('Sloped canvas shelter', edge, indices, tarp)
  createRock(meshes, 1.58, .57, .68, .8, true)
  crewAt(meshes, -.87, -.55, 1)
  meshes.box(0, .008, .78, 2.85, .017, .53, '#508a8b', undefined, false)
  return {
    sourceAt(time, index) {
      const lane = (index % 5 - 2) * .58
      const surge = contactAge(time, .28 + .035 * (index % 4), .67, .24)
      if (surge !== undefined) return { x: lane, y: 1.64 + Math.abs(lane) * .184, z: .59, floor: .02 }
    },
    accents: [{ id: 'surface-pops', sourceAt: (time, index) => {
      if (time >= .68) return { x: (index % 5 - 2) * .51, y: .022, z: .84 }
    } }],
  }
}

export function snuffFixture(meshes: MeshFactory): Fixture {
  const lamp = lanternStand(meshes, .94)
  const crew = crewAt(meshes, -.74, -.83)
  crew.root.rotation.y = .82
  return {
    sourceAt(time) {
      if (time > .52 && time < 1.13) return { x: 0, y: 1.34, z: 0 }
    },
    pose(time) {
      const lit = time < .52
      lamp.flame.setEnabled(lit)
      lamp.globe.visibility = lit ? 1 : .2
    },
  }
}
