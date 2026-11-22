import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Body, Box, Vec3, World } from 'cannon-es'
import { createGroundDrive } from '../src/simulation/ground-drive.ts'
import { flatbedGroundDrive } from '../src/vehicles/flatbed.ts'

test('ground drive uses the supplied wheel layout and steering tuning', () => {
  const specification = {
    ...flatbedGroundDrive,
    wheels: { radius: 0.64, halfTrack: 1.6, axles: [-2.4, 2.1] },
    parkedClearance: 0.125,
    steering: { ...flatbedGroundDrive.steering, carefulAngle: 0.24, response: 4 },
  }
  const terrainSamples = []
  const heightAt = (point) => {
    terrainSamples.push(point)
    return 0
  }
  const world = new World()
  const chassis = new Body({ mass: 1800, shape: new Box(new Vec3(1.4, 0.6, 2.6)) })
  const drive = createGroundDrive(world, chassis, specification, 0.75, heightAt)
  const parked = drive.park({ x: 0, z: 0, heading: 0 })
  assert.deepEqual(terrainSamples, [
    { x: -1.6, z: 2.1 },
    { x: 1.6, z: 2.1 },
    { x: -1.6, z: -2.4 },
    { x: 1.6, z: -2.4 },
  ])
  assert.equal(parked.y, specification.parkedClearance)
  assert.equal(parked.suspension.length, 4)
  const wheelHeight = specification.wheels.radius - specification.parkedClearance
  assert.ok(parked.suspension.every((height) => Math.abs(height - wheelHeight) < 1e-12))

  drive.applyInput({ x: 0.5, z: 0, careful: true }, 0.125)
  assert.equal(drive.finishStep(parked).steering, 0.06)
})
