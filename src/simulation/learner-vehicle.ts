import { Body, Box, Vec3, type World } from 'cannon-es'
import { learnerVehicles, type LearnerVehicleId } from '../learner-vehicles.ts'
import type { Point } from '../world.ts'
import { createGroundDrive } from './ground-drive.ts'

const linearDamping = 0.14
const angularDamping = 0.45
const half = 0.5

// A learner vehicle is a box-shaped chassis on the shared ground drive. It
// collides with the flatbed, crates and island colliders in the same world.
export function createLearnerPhysics(world: World, id: LearnerVehicleId, heightAt: (point: Point) => number) {
  const { mass, centreOfMass, colliders, drive } = learnerVehicles[id]
  const body = new Body({ mass, linearDamping, angularDamping })
  for (const { center: [x, y, z], size: [width, height, length] } of colliders) {
    body.addShape(new Box(new Vec3(width * half, height * half, length * half)), new Vec3(x, y - centreOfMass, z))
  }
  return createGroundDrive(world, body, drive, centreOfMass, heightAt)
}
