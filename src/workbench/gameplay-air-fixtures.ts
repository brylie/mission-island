import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createOilLantern } from '../assets/effect-props'
import { createRock } from '../assets/props'
import type { MeshFactory } from '../island-meshes'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

function lanternStand(meshes: MeshFactory, height: number) {
  const lantern = createOilLantern(meshes)
  lantern.root.position.y = height
  for (const x of [-0.38, 0.38]) {
    for (const z of [-0.22, 0.22]) meshes.box(x, height / 2, z, 0.085, height, 0.09, '#6a5c49')
  }
  meshes.box(0, height - 0.037, 0, 0.98, 0.073, 0.63, '#9e815f')
  return lantern
}

export function mothFixture(meshes: MeshFactory): Fixture {
  const height = 0.94
  const lamp = lanternStand(meshes, height)
  const crew = crewAt(meshes, -1.2, -0.51, 1)
  crew.root.rotation.y = 1.17
  const y = height + 0.26
  return {
    sourceAt(time, index) {
      const angle = time * 4.9 + index * 1.38
      const ray = 0.29 + (index % 5) * 0.107
      return { x: Math.cos(angle) * ray, y, z: Math.sin(angle) * ray, orbit: { x: 0, z: 0, angularSpeed: index % 3 ? 3.8 : -2.15, peelAfter: 1.45 } }
    },
    pose(time) {
      lamp.flame.scaling.y = 0.13 + 0.022 * Math.sin(time * 12)
    },
  }
}

export function ventFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, 0.66, -0.57, 2.7, 1.32, 1.37, '#6d766d')
  meshes.box(0, 1.34, -0.55, 2.95, 0.14, 1.54, '#486360')
  meshes.cylinder(0.03, 1.52, -0.23, 0.27, 0.29, 0.4, 9, '#8a9990')
  meshes.cylinder(0.03, 1.728, -0.23, 0.22, 0.22, 0.02, 9, '#405352')
  crewAt(meshes, -1.71, 0.42)
  return {
    sourceAt(time) {
      if (contactAge(time, 0.25, 1.1, 0.74) !== undefined) return { x: 0.03, y: 1.74, z: -0.23 }
    },
  }
}

export function gateFrostFixture(meshes: MeshFactory): Fixture {
  const gate = new TransformNode('Frosted gate', meshes.scene)
  gate.position.set(-1.05, 0, -0.13)
  const wood = '#817861', frost = '#c5d6cb'
  for (const x of [-1.09, 1.09]) {
    meshes.box(x, 0.64, -0.13, 0.135, 1.28, 0.16, wood)
    meshes.box(x, 1.29, -0.13, 0.146, 0.025, 0.17, frost)
  }
  for (const y of [0.37, 0.95]) meshes.box(1.02, y, 0, 1.96, 0.122, 0.087, wood, gate)
  for (let i = 0; i < 7; i++) {
    const x = 0.17 + i * 0.283
    meshes.box(x, 0.64, 0.012, 0.124, 0.83, 0.077, wood, gate)
    meshes.box(x, 1.062, 0.012, 0.131, 0.024, 0.088, frost, gate)
  }
  const crew = crewAt(meshes, 1.31, 0.72, 1)
  crew.root.rotation.y = -2.7
  const angle = (time: number) => 0.61 * Math.sin(Math.min(time, 3) * Math.PI / 3)
  return {
    sourceAt(time, index) {
      if (contactAge(time, 0.4, 1.05, 0.16) === undefined) return
      const arm = 0.62 + index % 7 * 0.19
      const yaw = angle(time)
      return { x: -1.05 + arm * Math.cos(yaw), z: -0.13 - arm * Math.sin(yaw), y: 1.076, yaw, floor: 0.015 }
    },
    pose(time) {
      gate.rotation.y = angle(time)
    },
  }
}

export function canvasRunoffFixture(meshes: MeshFactory): Fixture {
  for (const x of [-1.25, 1.25]) meshes.cylinder(x, 1.02, -0.38, 0.085, 0.097, 2.04, 7, '#7a7159')
  const tarp = meshes.paint('#57837b')
  tarp.backFaceCulling = false
  const edge: number[] = [], indices: number[] = []
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.46, lift = 0.085 * Math.abs(i - 3)
    edge.push(x, 2.04 + lift, -0.96, x, 1.64 + lift, 0.58)
    const n = i * 2
    if (i) indices.push(n - 2, n, n + 1, n - 2, n + 1, n - 1)
  }
  meshes.surface('Sloped canvas shelter', edge, indices, tarp)
  createRock(meshes, 1.58, 0.57, 0.68, 0.8, true)
  crewAt(meshes, -0.87, -0.55, 1)
  meshes.box(0, 0.008, 0.78, 2.85, 0.017, 0.53, '#508a8b', undefined, false)
  return {
    sourceAt(time, index) {
      const lane = (index % 5 - 2) * 0.58
      const surge = contactAge(time, 0.28 + 0.035 * (index % 4), 0.67, 0.24)
      if (surge !== undefined) return { x: lane, y: 1.64 + Math.abs(lane) * 0.184, z: 0.59, floor: 0.02 }
    },
    accents: [{ id: 'surface-pops', sourceAt: (time, index) => {
      if (time >= 0.68) return { x: (index % 5 - 2) * 0.51, y: 0.022, z: 0.84 }
    } }],
  }
}

export function snuffFixture(meshes: MeshFactory): Fixture {
  const lamp = lanternStand(meshes, 0.94)
  const crew = crewAt(meshes, -0.74, -0.83)
  crew.root.rotation.y = 0.82
  return {
    sourceAt(time) {
      if (time > 0.52 && time < 1.13) return { x: 0, y: 1.34, z: 0 }
    },
    pose(time) {
      const lit = time < 0.52
      lamp.flame.setEnabled(lit)
      lamp.globe.visibility = lit ? 1 : 0.2
    },
  }
}
