import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { coastalProfile } from './coastal-profiles'

type Section = readonly [number, number, number, number]
type Triple = readonly [number, number, number]
type EyePart = { x: number, z: number, size: Triple, color: string }
interface ShorebirdGeometry {
  plumage: { pale: string, dark: string, hood?: string, wing?: string }
  torso: { pivotY: number, belly: readonly Section[], mantle: readonly Section[] }
  wing: { x: number, headingRad: number, profile: readonly Section[] }
  leg: {
    pivot: Triple
    shin: { centerY: number, topDiameter: number, bottomDiameter: number, height: number, sides: number, color: string }
    toes: { spreadsRad: readonly number[], lateralSpread: number, y: number, z: number, size: Triple, segments: number, color: string }
  }
  head: {
    pivot: Triple
    hood: readonly Section[]
    bill: { profile: readonly Section[], sides: number, color: string }
    eyes: { y: number, segments: number, ring: EyePart, pupil: EyePart }
  }
  motion: { stepRate: number, stridePitch: number, probeRate: number, mantleRest: number, mantleDip: number, headDip: number }
}

const probePower = 3
const watchYawRad = 0.19
const watchRadPerSecond = 1.4

export function createShorebird(meshes: MeshFactory, name: string, geometry: ShorebirdGeometry) {
  const { plumage, torso, wing: foldedWing, leg: { pivot, shin, toes }, head: { pivot: peckPivot, hood, bill, eyes }, motion } = geometry
  const root = new TransformNode(name, meshes.scene)
  const body = new TransformNode('Breast and mantle', meshes.scene)
  body.parent = root
  body.position.y = torso.pivotY
  coastalProfile(meshes, body, 'Pale belly', plumage.pale, torso.belly)
  const legs: TransformNode[] = []
  const [legX, legY, legZ] = pivot
  for (const side of [-1, 1]) {
    const wing = coastalProfile(meshes, body, 'Folded wing', plumage.wing ?? plumage.dark, foldedWing.profile)
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
  coastalProfile(meshes, body, 'Mantle', plumage.dark, torso.mantle)
  const head = new TransformNode('Peck pivot', meshes.scene)
  head.parent = body
  head.position.set(...peckPivot)
  coastalProfile(meshes, head, 'Head', plumage.hood ?? plumage.dark, hood)
  coastalProfile(meshes, head, 'Bill', bill.color, bill.profile, bill.sides)
  const { ring, pupil } = eyes
  for (const side of [-1, 1]) {
    meshes.sphere(side * ring.x, eyes.y, ring.z, ...ring.size, ring.color, head, false, eyes.segments)
    meshes.sphere(side * pupil.x, eyes.y, pupil.z, ...pupil.size, pupil.color, head, false, eyes.segments)
  }
  function pose(time: number, feeding: boolean, stride = 0) {
    for (const [i, leg] of legs.entries()) leg.rotation.x = Math.sin(time * motion.stepRate + i * Math.PI) * motion.stridePitch * stride
    const dip = feeding ? Math.max(0, Math.sin(time * motion.probeRate)) ** probePower : 0
    body.rotation.x = motion.mantleRest + motion.mantleDip * dip
    head.rotation.x = motion.headDip * dip
    head.rotation.y = (1 - dip) * watchYawRad * Math.sin(time * watchRadPerSecond)
  }
  return { root, pose }
}
