import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { responsePickupBody, responsePickupLights, responsePickupSpec } from './geometry/response-pickup'
import {
  batchRigidParts,
  dressFleetWheel,
  fleetPaint,
  mountVehicleWheel,
  poseVehicleWheels,
  vehicleBodywork,
  vehicleLamps,
  type VehicleBodywork,
} from './vehicle-kit'

const sides = [-1, 1] as const
const frontAxleIndex = 1
// The light bar splits red and blue, as on the Saltwind crews, so it reads against the red paint.
const beaconColors = { left: '#d65847', right: '#498bc2' } as const

function buildBody({ box, panel }: VehicleBodywork) {
  const { finish, frame, upperBody, underbody, rocker, frontCorner, rearCorner, archLip, cab, roof, runningBoard } = responsePickupBody
  box(frame, fleetPaint.frame)
  panel('Pickup upper body', upperBody.halfWidth, upperBody.profile, finish)
  panel('Pickup underbody', underbody.halfWidth, underbody.profile, fleetPaint.frame)
  panel('Pickup crew cab', cab.halfWidth, cab.profile, finish)
  panel('Pickup cream roof', roof.halfWidth, roof.profile, fleetPaint.roofCream)
  for (const side of sides) {
    box(rocker, finish, side)
    box(frontCorner, finish, side)
    box(rearCorner, finish, side)
    for (const z of archLip.z) box({ center: [archLip.x, archLip.y, z], size: archLip.size }, fleetPaint.frame, side)
    box(runningBoard, fleetPaint.frame, side)
  }
}

function buildCabDetails({ box, panel }: VehicleBodywork) {
  const { windows, door, mirror, lightBar } = responsePickupBody
  box(windows.front, fleetPaint.windshield).rotation.x = windows.rake
  box(windows.rear, fleetPaint.windshield)
  for (const side of sides) {
    const { wiper } = windows
    box({ center: [wiper.x, wiper.center[1], wiper.center[2]], size: wiper.size }, fleetPaint.frame, side).rotation.set(windows.rake, 0, side * wiper.sweep)
    const { doors } = windows
    panel('Pickup front door glass', doors.halfWidth, doors.front, fleetPaint.doorGlass, side * doors.centerX)
    panel('Pickup rear door glass', doors.halfWidth, doors.rear, fleetPaint.doorGlass, side * doors.centerX)
    for (const z of door.seams.z) box({ center: [door.seams.x, door.seams.y, z], size: door.seams.size }, fleetPaint.frame, side)
    for (const z of door.handles.z) box({ center: [door.handles.x, door.handles.y, z], size: door.handles.size }, fleetPaint.frame, side)
    box(door.stripe, fleetPaint.roofCream, side)
    panel('Seabrook rescue shield', door.shield.halfWidth, door.shield.profile, fleetPaint.roofCream, side * door.shield.centerX)
    panel('Seabrook rescue flame', door.flame.halfWidth, door.flame.profile, responsePickupBody.finish, side * door.flame.centerX)
    box(mirror.mount, fleetPaint.frame, side)
    box(mirror.housing, fleetPaint.frame, side)
    box(mirror.glass, fleetPaint.brightTrim, side)
    box({ center: [lightBar.lens.x, lightBar.lens.center[1], lightBar.lens.center[2]], size: lightBar.lens.size }, side < 0 ? beaconColors.left : beaconColors.right, side)
  }
  box(lightBar.base, fleetPaint.frame)
  box(lightBar.clear, fleetPaint.headlamp)
}

function buildFrontAndRear({ box }: VehicleBodywork) {
  const { grille, headlightHousing, indicator, frontBumper, pushBar, rear } = responsePickupBody
  box(grille.surround, fleetPaint.frame)
  for (const y of grille.bar.heights) box({ center: [0, y, grille.bar.z], size: grille.bar.size }, fleetPaint.brightTrim)
  box(frontBumper, fleetPaint.bumper)
  for (const x of pushBar.x) box({ center: [x, pushBar.center[1], pushBar.center[2]], size: pushBar.size }, fleetPaint.frame)
  box(pushBar.rail, fleetPaint.frame)
  box(rear.bumper, fleetPaint.bumper)
  for (const side of sides) {
    box(headlightHousing, fleetPaint.frame, side)
    box(indicator, fleetPaint.indicator, side)
    box(rear.lightHousing, fleetPaint.frame, side)
    box(rear.amberLens, fleetPaint.tailAmber, side)
  }
}

function buildBed({ box, panel }: VehicleBodywork, meshes: MeshFactory) {
  const { finish, bed } = responsePickupBody
  const treadPlate = meshes.paintSurface('metal', fleetPaint.tread)
  box(bed.floor, treadPlate)
  for (const side of sides) {
    panel('Pickup bed side', bed.side.halfWidth, bed.side.profile, finish, side * bed.side.centerX)
    box(bed.railCap, fleetPaint.bumper, side)
  }
  box(bed.headboard, finish)
  box(bed.tailgate, finish)
  box(bed.tailgateHandle, fleetPaint.frame)
  box(bed.locker, fleetPaint.bumper)
  box(bed.lockerLid, treadPlate)
  for (const x of bed.lockerLatch.x) box({ center: [x, bed.lockerLatch.center[1], bed.lockerLatch.center[2]], size: bed.lockerLatch.size }, fleetPaint.brightTrim)
}

// Moving vehicles merge their rigid parts by finish; Workbench inspection can keep them apart.
export function createResponsePickup(meshes: MeshFactory, { merge = true } = {}) {
  const root = new TransformNode(responsePickupSpec.name, meshes.scene)
  const body = vehicleBodywork(meshes, root)
  buildBody(body)
  buildCabDetails(body)
  buildFrontAndRear(body)
  buildBed(body, meshes)
  const lamps = vehicleLamps(meshes, root, responsePickupLights.head, responsePickupLights.tail)
  const { wheelRadius: radius, halfTrack, axles, tireDepth } = responsePickupSpec
  const wheels = sides.flatMap((side) => axles.map((z, index) => {
    const wheel = mountVehicleWheel(meshes, root, side * halfTrack, radius, z, index === frontAxleIndex)
    dressFleetWheel(meshes, wheel.spin, side, radius, tireDepth)
    return wheel
  }))
  if (merge) {
    batchRigidParts(meshes, root, lamps.meshes)
    for (const { spin } of wheels) batchRigidParts(meshes, spin)
  }
  return {
    root,
    setLights: lamps.set,
    pose: (rotation: number, steering: number, suspension?: readonly number[], blend = 1) =>
      poseVehicleWheels(wheels, rotation, steering, radius, suspension, blend),
  }
}
