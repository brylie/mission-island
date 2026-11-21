import { Body, Box, Vec3, type World } from 'cannon-es'
import { groundHeight } from '../terrain.ts'
import type { Point } from '../world.ts'
import { flatbedGroundDrive } from '../vehicles/flatbed.ts'
import { truckBed, truckSideRails, truckTailLip } from '../world.ts'
import { createGroundDrive } from './ground-drive.ts'

const centreOfMass = 0.68

export function createTruckPhysics(world: World, heightAt: (point: Point) => number = groundHeight) {
  const body = new Body({ mass: 1450, linearDamping: 0.14, angularDamping: 0.45 })
  const box = (x: number, y: number, z: number, width: number, height: number, length: number) =>
    body.addShape(new Box(new Vec3(width / 2, height / 2, length / 2)), new Vec3(x, y - centreOfMass, z))
  box(0, truckBed.top - 0.095, truckBed.center, truckBed.width, 0.19, truckBed.length)
  box(0, 1.5, 1.05, 2.36, 1.6, 1.6)
  box(0, 0.74, 0, 2.28, 0.5, 5.7)
  box(0, 1.08, 2.3, 2.44, 0.7, 1.08)
  for (const side of [-1, 1]) {
    const { x, thickness, height } = truckSideRails
    box(side * x, truckBed.top + height / 2, truckBed.center, thickness, height, truckBed.length)
  }
  box(0, truckBed.top + truckTailLip.height / 2, truckTailLip.z, truckBed.width, truckTailLip.height, truckTailLip.thickness)

  const drive = createGroundDrive(world, body, flatbedGroundDrive, centreOfMass, heightAt)
  return {
    ...drive,
    matchBedMotion(cargo: Body) {
      body.getVelocityAtWorldPoint(cargo.position, cargo.velocity)
      cargo.angularVelocity.copy(body.angularVelocity)
    },
  }
}
