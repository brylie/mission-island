import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import type { Point } from '../world'
import { ridgeHeading, ridgeLandingRadius, ridgeLandingSign, ridgeMeadow, ridgeRack, ridgeWind, ridgeWindsock, ridgeWing } from '../worlds/starter/ridge-scout'
import type { createCrew } from './crew'

const spruce = '#56483b'
const orange = '#f58b47'
const cream = '#ffe9b8'
const blue = '#287282'

export function createHangGlider({ scene, paint, box }: MeshFactory) {
  const root = new TransformNode('Scout wing and harness', scene)
  const { nose, left, keel, right } = ridgeWing
  const positions = [nose, left, keel, right].flatMap(({ x, y, z }) => [x, y, z])
  const indices = [0, 1, 2, 0, 2, 3, 2, 1, 0, 3, 2, 0]
  const normals: number[] = []
  const sail = new Mesh('Training sail', scene)
  VertexData.ComputeNormals(positions, indices.slice(0, 6), normals)
  const vertices = new VertexData()
  vertices.positions = positions
  vertices.normals = normals
  vertices.indices = indices
  vertices.applyToMesh(sail)
  sail.material = paint('#d76838')
  sail.parent = root
  sail.isPickable = false

  for (const side of [-1, 1]) {
    const strut = box(side * 0.24, 1.52, 0.39, 0.035, 0.7, 0.035, spruce, root)
    strut.rotation.z = side * 0.31
    box(side * 0.16, 1.2, -0.21, 0.074, 0.43, 0.067, blue, root)
  }
  box(0, 1.19, 0.39, 0.68, 0.045, 0.045, spruce, root)
  box(0, 0.95, -0.14, 0.43, 0.12, 0.26, blue, root)
  return root
}

function siteRoot({ scene }: MeshFactory, point: Point, name: string, heading: number) {
  const root = new TransformNode(name, scene)
  root.position.set(point.x, groundHeight(point), point.z)
  root.rotation.y = heading
  return root
}

function createLandingCircle({ surface, paint }: MeshFactory) {
  const segments = 64
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i < segments; i++) {
    const angle = i * 2 * Math.PI / segments
    for (const radius of [ridgeLandingRadius - 0.38, ridgeLandingRadius]) {
      const x = ridgeMeadow.x + Math.cos(angle) * radius
      const z = ridgeMeadow.z + Math.sin(angle) * radius
      positions.push(x, groundHeight({ x, z }) + 0.045, z)
    }
    const a = 2 * i
    const next = (a + 2) % (segments * 2)
    indices.push(a, a + 1, next, next, a + 1, next + 1)
  }
  const plain = paint(cream, true)
  const marked = paint('#84eed9', true)
  const ring = surface('Windstone landing circle', positions, indices, plain)
  return (active: boolean) => {
    ring.material = active ? marked : plain
  }
}

export function createRidgeCourse(meshes: MeshFactory) {
  const { box, cylinder, paint } = meshes
  const rack = siteRoot(meshes, ridgeRack, 'Windstone loan rack', ridgeHeading)
  for (const side of [-1, 1]) box(side * 0.74, 0.58, 0, 0.14, 1.16, 0.14, spruce, rack)
  box(0, 1.09, 0, 1.74, 0.14, 0.27, spruce, rack)
  box(0, 0.81, 0, 0.78, 0.24, 0.16, blue, rack)

  const sock = siteRoot(meshes, ridgeWindsock, 'Training windsock', Math.atan2(ridgeWind.x, ridgeWind.z))
  cylinder(0, 1.32, 0, 0.05, 0.09, 2.64, 8, spruce, sock)
  for (let i = 0; i < 5; i++) {
    const part = cylinder(0, 2.55 - 0.018 * i, 0.13 + i * 0.2, 0.32 - 0.043 * i, 0.36 - 0.043 * i, 0.208, 12, i % 2 ? cream : orange, sock)
    part.rotation.x = Math.PI / 2
  }

  const markMeadow = createLandingCircle(meshes)
  const entrance = siteRoot(meshes, ridgeLandingSign, 'Landing sign', ridgeHeading)
  box(0, 0.63, 0, 0.15, 1.26, 0.15, spruce, entrance)
  box(0, 1.29, 0, 1.44, 0.51, 0.19, paint(orange, true), entrance)
  box(0, 1.29, 0.105, 0.83, 0.1, 0.031, paint(cream, true), entrance, false)

  return { rack, markMeadow }
}

export function poseHangGliderPilot(pilot: ReturnType<typeof createCrew>, blend: number) {
  pilot.look(0.17, 0, 0, blend)
  for (const [i, arm] of pilot.arms.entries()) {
    arm.rotation.x += (-1.42 - arm.rotation.x) * blend
    arm.rotation.z += ((i ? 0.17 : -0.17) - arm.rotation.z) * blend
    const leg = pilot.legs[i]
    leg.rotation.x += (0.2 - leg.rotation.x) * blend
    pilot.knees[i](0.42, blend)
  }
  pilot.fitSwimwear()
}
