import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { coastalProfile } from './coastal-profiles'
import { oystercatcherGeometry } from './geometry/oystercatcher'

const stepRadPerSecond = 13
const stridePitchRad = 0.44
const probeRadPerSecond = 2.2
const probePower = 3
const mantleRestPitchRad = 0.08
const mantleProbePitchRad = 0.84
const headProbePitchRad = 0.78
const watchYawRad = 0.19
const watchRadPerSecond = 1.4

export function createOystercatcher(meshes: MeshFactory) {
  const { plumage, torso, wing: foldedWing, leg: { pivot, shin, toes }, head: { pivot: peckPivot, hood, bill, eyes } } = oystercatcherGeometry
  const root = new TransformNode('Oystercatcher', meshes.scene)
  const body = new TransformNode('Breast and mantle', meshes.scene)
  body.parent = root
  body.position.y = torso.pivotY
  coastalProfile(meshes, body, 'Pale belly', plumage.pale, torso.belly)
  const legs: TransformNode[] = []
  const [legX, legY, legZ] = pivot
  for (const side of [-1, 1]) {
    const wing = coastalProfile(meshes, body, 'Folded wing', plumage.dark, foldedWing.profile)
    wing.position.x = side * foldedWing.x
    wing.rotation.y = side * foldedWing.headingRad
    const leg = new TransformNode('Wader leg', meshes.scene)
    legs.push(leg)
    leg.parent = root
    leg.position.set(side * legX, legY, legZ)
    meshes.cylinder(0, shin.centerY, 0, shin.topDiameter, shin.bottomDiameter, shin.height, shin.sides, shin.color, leg)
    for (const spread of toes.spreadsRad) {
      const toe = meshes.sphere(toes.lateralSpread * Math.sin(spread), toes.y, toes.z, ...toes.size, toes.color, leg, false, toes.segments)
      toe.rotation.y = spread
    }
  }
  coastalProfile(meshes, body, 'Dark mantle and bib', plumage.dark, torso.mantle)
  const head = new TransformNode('Peck pivot', meshes.scene)
  head.parent = body
  head.position.set(...peckPivot)
  coastalProfile(meshes, head, 'Dark hood', plumage.dark, hood)
  coastalProfile(meshes, head, 'Chisel bill', bill.color, bill.profile, bill.sides)
  const { ring, pupil } = eyes
  for (const side of [-1, 1]) {
    meshes.sphere(side * ring.x, eyes.y, ring.z, ...ring.size, ring.color, head, false, eyes.segments)
    meshes.sphere(side * pupil.x, eyes.y, pupil.z, ...pupil.size, pupil.color, head, false, eyes.segments)
  }
  function pose(time: number, feeding: boolean, stride = 0) {
    for (const [i, leg] of legs.entries()) leg.rotation.x = Math.sin(time * stepRadPerSecond + i * Math.PI) * stridePitchRad * stride
    const dip = feeding ? Math.max(0, Math.sin(time * probeRadPerSecond)) ** probePower : 0
    body.rotation.x = mantleRestPitchRad + mantleProbePitchRad * dip
    head.rotation.x = headProbePitchRad * dip
    head.rotation.y = (1 - dip) * watchYawRad * Math.sin(time * watchRadPerSecond)
  }
  return { root, pose }
}
