import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import type { Point } from '../world'
import { ridgeHeading, ridgeLandingRadius, ridgeLandingSign, ridgeMeadow, ridgeRack,
  ridgeWind, ridgeWindsock, ridgeWing } from '../worlds/starter/ridge-scout'
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
    const strut = box(side * .24, 1.52, .39, .035, .7, .035, spruce, root)
    strut.rotation.z = side * .31
    box(side * .16, 1.2, -.21, .074, .43, .067, blue, root)
  }
  box(0, 1.19, .39, .68, .045, .045, spruce, root)
  box(0, .95, -.14, .43, .12, .26, blue, root)
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
    for (const radius of [ridgeLandingRadius - .38, ridgeLandingRadius]) {
      const x = ridgeMeadow.x + Math.cos(angle) * radius
      const z = ridgeMeadow.z + Math.sin(angle) * radius
      positions.push(x, groundHeight({ x, z }) + .045, z)
    }
    const a = 2 * i
    const next = (a + 2) % (segments * 2)
    indices.push(a, a + 1, next, next, a + 1, next + 1)
  }
  const plain = paint(cream, true)
  const marked = paint('#84eed9', true)
  const ring = surface('Windstone landing circle', positions, indices, plain)
  return (active: boolean) => { ring.material = active ? marked : plain }
}

export function createRidgeCourse(meshes: MeshFactory) {
  const { box, cylinder, paint } = meshes
  const rack = siteRoot(meshes, ridgeRack, 'Windstone loan rack', ridgeHeading)
  for (const side of [-1, 1]) box(side * .74, .58, 0, .14, 1.16, .14, spruce, rack)
  box(0, 1.09, 0, 1.74, .14, .27, spruce, rack)
  box(0, .81, 0, .78, .24, .16, blue, rack)

  const sock = siteRoot(meshes, ridgeWindsock, 'Training windsock', Math.atan2(ridgeWind.x, ridgeWind.z))
  cylinder(0, 1.32, 0, .05, .09, 2.64, 8, spruce, sock)
  for (let i = 0; i < 5; i++) {
    const part = cylinder(0, 2.55 - .018 * i, .13 + i * .2, .32 - .043 * i, .36 - .043 * i, .208, 12,
      i % 2 ? cream : orange, sock)
    part.rotation.x = Math.PI / 2
  }

  const markMeadow = createLandingCircle(meshes)
  const entrance = siteRoot(meshes, ridgeLandingSign, 'Landing sign', ridgeHeading)
  box(0, .63, 0, .15, 1.26, .15, spruce, entrance)
  box(0, 1.29, 0, 1.44, .51, .19, paint(orange, true), entrance)
  box(0, 1.29, .105, .83, .1, .031, paint(cream, true), entrance, false)

  return { rack, markMeadow }
}

export function poseHangGliderPilot(pilot: ReturnType<typeof createCrew>, blend: number) {
  pilot.look(.17, 0, 0, blend)
  for (const [i, arm] of pilot.arms.entries()) {
    arm.rotation.x += (-1.42 - arm.rotation.x) * blend
    arm.rotation.z += ((i ? .17 : -.17) - arm.rotation.z) * blend
    const leg = pilot.legs[i]
    leg.rotation.x += (.2 - leg.rotation.x) * blend
    pilot.knees[i](.42, blend)
  }
  pilot.fitSwimwear()
}
