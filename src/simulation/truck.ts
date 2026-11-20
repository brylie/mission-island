import { Body, Box, RaycastVehicle, Vec3 } from 'cannon-es'
import type { World } from 'cannon-es'
import type { Input } from '../protocol.ts'
import { groundHeight } from '../terrain.ts'
import { parkedTruckPose, truckPoint, wheelAxles, wheelRadius, wheelTrack } from '../truck-pose.ts'
import type { Truck, TruckPose } from '../truck-pose.ts'
import { offset, truckBed, truckSideRails, truckTailLip } from '../world.ts'
import type { Pose } from '../world.ts'

const centreOfMass = 0.68
const suspensionMount = 0.79
const suspensionRest = 0.38
const parkedClearance = 0.01

export function createTruckPhysics(world: World) {
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

  const vehicle = new RaycastVehicle({ chassisBody: body, indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: 2 })
  for (const side of [-1, 1]) {
    for (const z of wheelAxles) {
      vehicle.addWheel({
        chassisConnectionPointLocal: new Vec3(side * wheelTrack, suspensionMount - centreOfMass, z),
        directionLocal: new Vec3(0, -1, 0), axleLocal: new Vec3(-1, 0, 0), isFrontWheel: z > 0,
        radius: wheelRadius, suspensionRestLength: suspensionRest, maxSuspensionTravel: 0.28,
        suspensionStiffness: 40, dampingCompression: 4.6, dampingRelaxation: 4.2,
        frictionSlip: 2.7, rollInfluence: 0.21, maxSuspensionForce: 16500,
      })
    }
  }
  world.addBody(body)
  vehicle.world = world
  world.addEventListener('preStep', () => {
    if (body.sleepState !== Body.SLEEPING) vehicle.updateVehicle(world.dt)
  })

  const forward = new Vec3()
  const right = new Vec3()
  const up = new Vec3()
  const origin = new Vec3()
  const modelOrigin = new Vec3(0, -centreOfMass, 0)
  const longitudinalSpeed = () => body.vectorToWorldFrame(Vec3.UNIT_Z, forward).dot(body.velocity)
  let steering = 0
  let braking = false
  let holding = true

  function read(): Truck {
    body.pointToWorldFrame(modelOrigin, origin)
    body.vectorToWorldFrame(Vec3.UNIT_X, right)
    body.vectorToWorldFrame(Vec3.UNIT_Y, up)
    const speed = longitudinalSpeed()
    return { x: origin.x, y: origin.y, z: origin.z, heading: Math.atan2(forward.x, forward.z),
      pitch: Math.atan2(-forward.y, Math.hypot(forward.x, forward.z)), roll: Math.atan2(right.y, up.y), speed,
      steering, braking, suspension: vehicle.wheelInfos.map((wheel) => suspensionMount - wheel.suspensionLength) }
  }

  function place(pose: TruckPose) {
    body.quaternion.setFromEuler(pose.pitch, pose.heading, pose.roll, 'YXZ')
    const centre = truckPoint(pose, 0, centreOfMass, 0)
    body.position.set(centre.x, centre.y, centre.z)
    body.velocity.setZero()
    body.angularVelocity.setZero()
    body.aabbNeedsUpdate = true
    body.wakeUp()
  }

  function park(pose: Pose) {
    place(parkedTruckPose(pose, parkedClearance))
    for (const wheel of vehicle.wheelInfos) wheel.suspensionLength = suspensionMount - wheelRadius + parkedClearance
    steering = 0
    braking = false
    return read()
  }

  function applyInput(input: Input, dt: number) {
    const speed = longitudinalSpeed()
    braking = input.brake === true || (Math.abs(speed) > 0.55 && input.z * speed < 0)
    holding = input.brake === true || input.z === 0
    if (!holding) body.wakeUp()
    const limit = input.z < 0 ? 5 : input.careful ? 6.2 : 13
    const power = Math.min(1, Math.max(0, (limit - Math.abs(speed)) / 1.8))
    const engine = braking ? 0 : -input.z * 3650 * power
    const drag = braking ? Math.min(125, 20 + Math.abs(speed) * 50) : input.z ? 4 : 16
    const target = input.x * (input.careful ? 0.35 : 0.6 - 0.34 * Math.min(1, Math.abs(speed) / 13))
    steering += (target - steering) * Math.min(1, dt * 9)
    vehicle.wheelInfos.forEach(({ isFrontWheel }, index) => {
      vehicle.setSteeringValue(isFrontWheel ? steering : 0, index)
      vehicle.applyEngineForce(isFrontWheel ? 0 : engine, index)
      vehicle.setBrake(drag, index)
    })
  }

  function finishStep(before: Truck) {
    const after = read()
    const direction = Math.sign(after.speed)
    const leading = offset(after, 0, direction * 1.9)
    const wasLeading = offset(before, 0, direction * 1.9)
    const leadingHeight = groundHeight(leading)
    if ((leadingHeight < -0.27 && leadingHeight < groundHeight(wasLeading)) ||
      Math.abs(after.roll) > 1.35 || Math.abs(after.pitch) > 1.35) {
      place(before)
      return read()
    }
    if (holding && body.sleepState !== Body.SLEEPING && body.velocity.lengthSquared() < 0.075 &&
      body.angularVelocity.lengthSquared() < 0.04 && vehicle.numWheelsOnGround >= 3) {
      body.sleep()
      after.speed = 0
    }
    return after
  }

  function matchBedMotion(cargo: Body) {
    body.getVelocityAtWorldPoint(cargo.position, cargo.velocity)
    cargo.angularVelocity.copy(body.angularVelocity)
  }

  return { park, applyInput, finishStep, matchBedMotion }
}
