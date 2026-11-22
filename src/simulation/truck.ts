import { Body, Box, Vec3, type World } from 'cannon-es'
import { flatbedCargoBoxes, flatbedDeck, truckBed, truckSideRails, truckTailLip } from '../assets/geometry/flatbed.ts'
import { groundHeight } from '../terrain.ts'
import type { Point } from '../world.ts'
import { flatbedGroundDrive } from '../vehicles/flatbed.ts'
import { createGroundDrive } from './ground-drive.ts'

const truckMass = 1450
const linearDamping = 0.14
const angularDamping = 0.45
const centreOfMass = 0.68
const half = 0.5
const sides = [-1, 1] as const

export function createTruckPhysics(world: World, heightAt: (point: Point) => number = groundHeight) {
  const body = new Body({ mass: truckMass, linearDamping, angularDamping })
  const box = (x: number, y: number, z: number, width: number, height: number, length: number) =>
    body.addShape(new Box(new Vec3(width * half, height * half, length * half)), new Vec3(x, y - centreOfMass, z))
  const { top, center, width, length } = truckBed
  box(0, top - flatbedDeck.thickness * half, center, width, flatbedDeck.thickness, length)
  // Only the deck counts as the bed for cargo sounds; rails, lip and cab are separate shapes.
  const bedShape = body.shapes[0]
  const { cab, chassis, hood } = flatbedCargoBoxes
  box(...cab.center, ...cab.size)
  box(...chassis.center, ...chassis.size)
  box(...hood.center, ...hood.size)
  const { x, thickness, height } = truckSideRails
  for (const side of sides) box(side * x, top + height * half, center, thickness, height, length)
  box(0, top + truckTailLip.height * half, truckTailLip.z, width, truckTailLip.height, truckTailLip.thickness)

  const drive = createGroundDrive(world, body, flatbedGroundDrive, centreOfMass, heightAt)
  return {
    ...drive,
    body,
    bedShape,
    matchBedMotion(cargo: Body) {
      body.getVelocityAtWorldPoint(cargo.position, cargo.velocity)
      cargo.angularVelocity.copy(body.angularVelocity)
    },
  }
}
