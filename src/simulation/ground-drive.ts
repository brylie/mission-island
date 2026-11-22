import { Body, RaycastVehicle, Vec3, type World } from 'cannon-es'
import type { Input } from '../protocol.ts'
import { parkedGroundPose, truckPoint } from '../truck-pose.ts'
import type { Truck, TruckPose } from '../truck-pose.ts'
import type { GroundDrive } from '../vehicles/ground-drive.ts'
import { offset, type Point, type Pose } from '../world.ts'

const forwardAxis = 2
const minimumShoreRoadHeightM = -0.27
const maximumUprightTiltRad = 1.35
const sleepingSpeedSquared = 0.075
const sleepingTurnSpeedSquared = 0.04
const minimumPlantedWheels = 3

type DriveInput = Pick<Input, 'x' | 'z' | 'brake' | 'careful'>

export function createGroundDrive(
  world: World,
  body: Body,
  drive: GroundDrive,
  centreOfMass: number,
  heightAt: (point: Point) => number,
) {
  const { brakes, engine, steering: steeringSpec, parkedClearance, shoreProbeDistance } = drive
  const { radius, halfTrack, axles } = drive.wheels
  const { mountHeight, ...suspension } = drive.suspension
  const vehicle = new RaycastVehicle({ chassisBody: body, indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: forwardAxis })
  for (const side of [-1, 1]) {
    for (const [axle, z] of axles.entries()) {
      vehicle.addWheel({
        chassisConnectionPointLocal: new Vec3(side * halfTrack, mountHeight - centreOfMass, z),
        directionLocal: new Vec3(0, -1, 0),
        axleLocal: new Vec3(-1, 0, 0),
        isFrontWheel: axle === 1,
        radius,
        ...suspension,
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
    return { x: origin.x, y: origin.y, z: origin.z, heading: Math.atan2(forward.x, forward.z), pitch: Math.atan2(-forward.y, Math.hypot(forward.x, forward.z)), roll: Math.atan2(right.y, up.y), speed, steering, braking, suspension: vehicle.wheelInfos.map((wheel) => mountHeight - wheel.suspensionLength) }
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
    place(parkedGroundPose(pose, drive.wheels, heightAt, parkedClearance))
    for (const wheel of vehicle.wheelInfos) wheel.suspensionLength = mountHeight - radius + parkedClearance
    steering = 0
    braking = false
    return read()
  }

  function applyInput(input: DriveInput, dt: number) {
    const speed = longitudinalSpeed()
    const speedMagnitude = Math.abs(speed)
    braking = input.brake === true || (speedMagnitude > brakes.reverseThreshold && input.z * speed < 0)
    holding = input.brake === true || input.z === 0
    if (!holding) body.wakeUp()
    const limit = input.z < 0 ? engine.reverseSpeed : input.careful ? engine.carefulSpeed : engine.forwardSpeed
    const power = Math.min(1, Math.max(0, (limit - speedMagnitude) / engine.powerFadeRange))
    const engineForce = braking ? 0 : -input.z * engine.force * power
    const drag = braking
      ? Math.min(brakes.maxForce, brakes.baseForce + speedMagnitude * brakes.forcePerSpeed)
      : input.z ? brakes.poweredDrag : brakes.idleDrag
    const angle = input.careful
      ? steeringSpec.carefulAngle
      : steeringSpec.lowSpeedAngle - steeringSpec.speedReduction * Math.min(1, speedMagnitude / engine.forwardSpeed)
    const target = input.x * angle
    steering += (target - steering) * Math.min(1, dt * steeringSpec.response)
    vehicle.wheelInfos.forEach(({ isFrontWheel }, index) => {
      vehicle.setSteeringValue(isFrontWheel ? steering : 0, index)
      vehicle.applyEngineForce(isFrontWheel ? 0 : engineForce, index)
      vehicle.setBrake(drag, index)
    })
  }

  function finishStep(before: Truck) {
    const after = read()
    const direction = Math.sign(after.speed)
    const leading = offset(after, 0, direction * shoreProbeDistance)
    const wasLeading = offset(before, 0, direction * shoreProbeDistance)
    const leadingHeight = heightAt(leading)
    if ((leadingHeight < minimumShoreRoadHeightM && leadingHeight < heightAt(wasLeading))
      || Math.abs(after.roll) > maximumUprightTiltRad || Math.abs(after.pitch) > maximumUprightTiltRad) {
      place(before)
      return read()
    }
    if (holding && body.sleepState !== Body.SLEEPING && body.velocity.lengthSquared() < sleepingSpeedSquared
      && body.angularVelocity.lengthSquared() < sleepingTurnSpeedSquared && vehicle.numWheelsOnGround >= minimumPlantedWheels) {
      body.sleep()
      after.speed = 0
    }
    return after
  }

  return { park, applyInput, finishStep }
}
