import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import type { Point } from '../world'
import { ridgeLandingRadius, ridgeLandingSign, ridgeMeadow, ridgeRack, ridgeWind, ridgeWindsock } from '../worlds/starter/ridge-scout'
import type { createCrew } from './crew'
import { ridgeCoursePaint, ridgeCourseTrim, ridgeGliderTrim, ridgeWing } from './geometry/ridge-course'

const { spruce, orange, cream, blue } = ridgeCoursePaint
const half = 0.5
const quarterTurn = Math.PI * half
const piRadiansPerTurn = 2
const landingRingVerticesPerSegment = 2
const bandColorPeriod = 2

const pilotHeadPitch = 0.17
const pilotArmPitch = -1.42
const pilotArmRoll = 0.17
const pilotHipPitch = 0.2
const pilotKneePitch = 0.42

export function createHangGlider({ scene, paint, box }: MeshFactory) {
  const root = new TransformNode('Scout wing and harness', scene)
  const { nose, left, keel, right } = ridgeWing
  const positions = [nose, left, keel, right].flatMap(({ x, y, z }) => [x, y, z])
  const { sail: canvas, strut, shoulderStrap, controlBar, harnessSeat } = ridgeGliderTrim
  const normals: number[] = []
  const sail = new Mesh('Training sail', scene)
  VertexData.ComputeNormals(positions, [...canvas.front], normals)
  const vertices = new VertexData()
  vertices.positions = positions
  vertices.normals = normals
  vertices.indices = [...canvas.front, ...canvas.back]
  vertices.applyToMesh(sail)
  sail.material = paint(canvas.finish)
  sail.parent = root
  sail.isPickable = false

  for (const side of [-1, 1]) {
    box(side * strut.center[0], strut.center[1], strut.center[2], ...strut.size, spruce, root).rotation.z = side * strut.splay
    box(side * shoulderStrap.center[0], shoulderStrap.center[1], shoulderStrap.center[2], ...shoulderStrap.size, blue, root)
  }
  box(...controlBar, spruce, root)
  box(...harnessSeat, blue, root)
  return root
}

function siteRoot({ scene }: MeshFactory, point: Point, name: string, heading: number) {
  const root = new TransformNode(name, scene)
  root.position.set(point.x, groundHeight(point), point.z)
  root.rotation.y = heading
  return root
}

function createLandingCircle({ surface, paint }: MeshFactory) {
  const { segments, width, raised } = ridgeCourseTrim.landingRing
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i < segments; i++) {
    const angle = i * piRadiansPerTurn * Math.PI / segments
    for (const radius of [ridgeLandingRadius - width, ridgeLandingRadius]) {
      const x = ridgeMeadow.x + Math.cos(angle) * radius
      const z = ridgeMeadow.z + Math.sin(angle) * radius
      positions.push(x, groundHeight({ x, z }) + raised, z)
    }
    const a = landingRingVerticesPerSegment * i
    const next = (a + landingRingVerticesPerSegment) % (segments * landingRingVerticesPerSegment)
    indices.push(a, a + 1, next, next, a + 1, next + 1)
  }
  const plain = paint(cream, true)
  const marked = paint(ridgeCoursePaint.marked, true)
  const ring = surface('Windstone landing circle', positions, indices, plain)
  return (active: boolean) => {
    ring.material = active ? marked : plain
  }
}

export function createRidgeCourse(meshes: MeshFactory) {
  const { box, cylinder, paint } = meshes
  const { rack: rackTrim, windsock, signStripe } = ridgeCourseTrim
  const rack = siteRoot(meshes, ridgeRack, 'Windstone loan rack', ridgeRack.heading)
  const { post: rackPost, beam, cushion } = rackTrim
  for (const side of [-1, 1]) box(side * rackPost.x, rackPost.height * half, 0, rackPost.width, rackPost.height, rackPost.depth, spruce, rack)
  box(0, beam.y, 0, beam.width, beam.height, beam.depth, spruce, rack)
  box(...cushion, blue, rack)

  const sock = siteRoot(meshes, ridgeWindsock, 'Training windsock', Math.atan2(ridgeWind.x, ridgeWind.z))
  const { baseDiameter, height } = ridgeWindsock.geometry.pole
  cylinder(0, height * half, 0, windsock.pole.topDiameter, baseDiameter, height, windsock.pole.segments, spruce, sock)
  const { bands } = windsock
  for (let i = 0; i < bands.count; i++) {
    const part = cylinder(0, bands.y - bands.drop * i, bands.z + i * bands.spacing, bands.tip - bands.taper * i, bands.base - bands.taper * i, bands.length, bands.segments, i % bandColorPeriod ? cream : orange, sock)
    part.rotation.x = quarterTurn
  }

  const markMeadow = createLandingCircle(meshes)
  const entrance = siteRoot(meshes, ridgeLandingSign, 'Landing sign', ridgeLandingSign.heading)
  const { post, face } = ridgeLandingSign.geometry
  box(0, post.height * half, 0, post.width, post.height, post.depth, spruce, entrance)
  box(0, face.centreY, 0, face.width, face.height, face.depth, paint(orange, true), entrance)
  box(0, face.centreY, signStripe.z, ...signStripe.size, paint(cream, true), entrance, false)

  return { rack, markMeadow }
}

export function poseHangGliderPilot(pilot: ReturnType<typeof createCrew>, blend: number) {
  pilot.look(pilotHeadPitch, 0, 0, blend)
  for (const [i, arm] of pilot.arms.entries()) {
    arm.rotation.x += (pilotArmPitch - arm.rotation.x) * blend
    arm.rotation.z += ((i ? pilotArmRoll : -pilotArmRoll) - arm.rotation.z) * blend
    const leg = pilot.legs[i]
    leg.rotation.x += (pilotHipPitch - leg.rotation.x) * blend
    pilot.knees[i](pilotKneePitch, blend)
  }
  pilot.fitSwimwear()
}
