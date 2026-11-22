import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { gullAt } from '../gull-flight'
import type { MeshFactory } from '../island-meshes'
import { gullGeometry } from './geometry/gull'

const mirroredSides = [-1, 1] as const
const half = 0.5
const quarterTurn = Math.PI * half
const tuckedLegLiftM = 0.132
const tuckedLegPitchRad = -0.66
const shoulderFoldSweepRad = 1.32
const shoulderFoldDropRad = 0.16
const shoulderFoldShortening = 0.31
const wingtipRestSweepRad = 0.085
const wingtipFoldSweepRad = 0.92
const wingtipCounterFlap = 0.41
const wingtipFoldDropRad = 0.04

export function createGull(meshes: MeshFactory, index: number) {
  const { paint, body: anatomy, featherFaces, shoulder: upperWing, wingtip, feet } = gullGeometry
  const root = new TransformNode('Harbor gull ' + (index + 1), meshes.scene)
  const body = new TransformNode('Gull body', meshes.scene)
  body.parent = root
  for (const part of [anatomy.torso, anatomy.head, anatomy.throat]) {
    const [x, y, z, width, height, depth] = part.ellipsoid
    meshes.sphere(x, y, z, width, height, depth, paint.belly, body, false, part.segments)
  }
  const beak = meshes.cylinder(...anatomy.bill, paint.skin, body, false)
  beak.rotation.x = quarterTurn
  const { eye } = anatomy
  for (const side of mirroredSides) {
    meshes.sphere(side * eye.x, eye.y, eye.z, ...eye.size, paint.eye, body, false, eye.segments)
  }
  function feathers(name: string, points: readonly (readonly [number, number, number])[], color: string, parent: TransformNode, side = 1) {
    const material = meshes.paint(color)
    material.backFaceCulling = false
    const vertices = points.flatMap(([x, y, z]) => [x === 0 ? x : side * x, y, z])
    return meshes.surface(name, vertices, [...featherFaces], material, parent)
  }
  feathers('Gull tail', anatomy.tail, paint.belly, body)
  const wings = mirroredSides.map((side) => {
    const shoulder = new TransformNode('Gull shoulder', meshes.scene)
    shoulder.parent = body
    const [shoulderX, shoulderY, shoulderZ] = upperWing.pivot
    shoulder.position.set(side * shoulderX, shoulderY, shoulderZ)
    feathers('Gull inner wing', upperWing.feathers, paint.secondaryFeathers, shoulder, side)
    const primary = new TransformNode('Gull wingtip hinge', meshes.scene)
    primary.parent = shoulder
    const [tipX, tipY, tipZ] = wingtip.pivot
    primary.position.set(side * tipX, tipY, tipZ)
    feathers('Tapered primary feathers', wingtip.feathers, paint.primaryFeathers, primary, side)
    const { whitePatch } = wingtip
    meshes.sphere(side * whitePatch.x, whitePatch.y, whitePatch.z, ...whitePatch.size, paint.belly, primary, false, whitePatch.segments)
    return { side, shoulder, primary }
  })
  const legs = new TransformNode('Gull legs and webbed toes', meshes.scene)
  legs.parent = root
  const { leg, toes } = feet
  for (const x of feet.x) {
    meshes.cylinder(x, leg.y, leg.z, leg.topDiameter, leg.bottomDiameter, leg.height, leg.sides, paint.skin, legs, false)
    meshes.sphere(x, toes.y, toes.z, ...toes.size, paint.skin, legs, false, toes.segments)
  }
  return {
    root,
    pose(sample: ReturnType<typeof gullAt>) {
      root.position.set(sample.x, sample.y, sample.z)
      root.rotation.y = sample.heading
      body.position.y = anatomy.restingPivotY - sample.crouch
      body.rotation.set(sample.pitch, 0, sample.bank)
      legs.position.y = sample.tuck * tuckedLegLiftM
      legs.rotation.x = tuckedLegPitchRad * sample.tuck
      for (const { side, shoulder, primary } of wings) {
        shoulder.rotation.y = side * (sample.sweep + sample.fold * shoulderFoldSweepRad)
        shoulder.rotation.z = side * (sample.flap - sample.fold * shoulderFoldDropRad)
        shoulder.scaling.x = 1 - sample.fold * shoulderFoldShortening
        primary.rotation.y = side * (wingtipRestSweepRad + sample.fold * wingtipFoldSweepRad)
        primary.rotation.z = side * (-sample.flap * wingtipCounterFlap - sample.fold * wingtipFoldDropRad)
      }
    },
  }
}
