import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { compactTractorBody, compactTractorLights, compactTractorSpec, tractorRim, tractorTread } from './geometry/compact-tractor'
import {
  batchRigidParts,
  fleetPaint,
  mountVehicleWheel,
  poseVehicleWheels,
  vehicleBodywork,
  vehicleLamps,
  type VehicleBodywork,
} from './vehicle-kit'

const sides = [-1, 1] as const
const half = 0.5
const quarterTurn = Math.PI * half
const fullTurn = Math.PI + Math.PI
const diameterPerRadius = 2
const lugsPerPair = 2
const slowSignOrange = '#e0773a'
const seatBlack = '#2f3a36'

// A farm tire: rubber drum, staggered lugs across the tread and a cream rim.
function dressTractorWheel(meshes: MeshFactory, wheel: TransformNode, side: number, radius: number, depth: number) {
  const { count, lateral, size } = tractorTread
  const { diameterPerRadius: rimSize, standoff, depth: rimDepth, hubRatio, capRatio, segments } = tractorRim
  const diameter = radius * diameterPerRadius
  meshes.cylinder(0, 0, 0, diameter, diameter, depth, segments, fleetPaint.rubber, wheel).rotation.z = quarterTurn
  for (let i = 0; i < count; i++) {
    const angle = i * fullTurn / count
    const across = i % lugsPerPair ? 1 : -1
    const lug = meshes.box(across * lateral * depth, radius * Math.cos(angle), radius * Math.sin(angle), size[0] * depth, size[1], size[2], fleetPaint.rubber, wheel)
    lug.rotation.x = angle
  }
  // Each disc stands a little further out than the last so no faces share a plane.
  const rim = radius * rimSize
  const discs = [[1, fleetPaint.roofCream], [hubRatio, fleetPaint.frame], [capRatio, fleetPaint.roofCream]] as const
  for (const [index, [ratio, color]] of discs.entries()) {
    const face = side * (depth * half + standoff * (index + 1))
    meshes.cylinder(face, 0, 0, rim * ratio, rim * ratio, rimDepth, segments, color, wheel).rotation.z = quarterTurn
  }
}

function buildBody({ box, panel }: VehicleBodywork, meshes: MeshFactory, root: TransformNode) {
  const { finish, chassis, frontAxleBeam, hood, louvers, stripe, grille, headlightHousing, weightBracket, exhaust, cowl, steering } = compactTractorBody
  box(chassis, fleetPaint.frame)
  box(frontAxleBeam, fleetPaint.frame)
  panel('Tractor hood', hood.halfWidth, hood.profile, finish)
  box(cowl, finish)
  for (const side of sides) {
    for (const z of louvers.z) box({ center: [louvers.x, louvers.y, z], size: louvers.size }, fleetPaint.frame, side)
    box(stripe, fleetPaint.roofCream, side)
    box({ center: [headlightHousing.x, headlightHousing.center[1], headlightHousing.center[2]], size: headlightHousing.size }, fleetPaint.frame, side)
  }
  box(grille.surround, fleetPaint.frame)
  for (const y of grille.bar.heights) box({ center: [0, y, grille.bar.z], size: grille.bar.size }, fleetPaint.brightTrim)
  box(weightBracket, fleetPaint.frame)
  const [x, y, z] = exhaust.center
  meshes.cylinder(x, y, z, exhaust.diameter, exhaust.diameter, exhaust.height, exhaust.segments, fleetPaint.frame, root)
  meshes.cylinder(x, y + (exhaust.height + exhaust.cap.height) * half, z, exhaust.cap.diameter, exhaust.cap.diameter, exhaust.cap.height, exhaust.segments, fleetPaint.frame, root)
  box(steering.column, fleetPaint.frame).rotation.x = steering.column.tilt
  const [wheelX, wheelY, wheelZ] = steering.wheel.center
  const { diameter, thickness, segments, tilt } = steering.wheel
  meshes.cylinder(wheelX, wheelY, wheelZ, diameter, diameter, thickness, segments, fleetPaint.frame, root).rotation.x = tilt
}

function buildOperatorStation({ box }: VehicleBodywork, meshes: MeshFactory) {
  const { finish, platform, seat, fender, rops, hitch, tailLightHousing } = compactTractorBody
  box(platform, meshes.paintSurface('metal', fleetPaint.tread))
  box(seat.post, fleetPaint.frame)
  box(seat.pan, seatBlack)
  box(seat.back, seatBlack).rotation.x = seat.back.rake
  const [axleZ, axleY] = fender.axle
  for (const side of sides) {
    for (const angle of fender.angles) {
      const plate = box({ center: [fender.x, axleY + fender.radius * Math.sin(angle), axleZ + fender.radius * Math.cos(angle)], size: fender.plate }, finish, side)
      plate.rotation.x = quarterTurn - angle
    }
    box({ center: [tailLightHousing.x, tailLightHousing.center[1], tailLightHousing.center[2]], size: tailLightHousing.size }, fleetPaint.frame, side)
  }
  for (const x of rops.posts.x) box({ center: [x, rops.posts.center[1], rops.posts.center[2]], size: rops.posts.size }, fleetPaint.frame)
  box(rops.bar, fleetPaint.roofCream)
  box(rops.signRail, fleetPaint.frame)
  box(rops.beacon, fleetPaint.roofMarker)
  box(rops.slowSign, slowSignOrange).rotation.z = rops.slowSign.turn
  for (const x of hitch.arms.x) box({ center: [x, hitch.arms.center[1], hitch.arms.center[2]], size: hitch.arms.size }, fleetPaint.frame)
  box(hitch.drawbar, fleetPaint.frame)
}

export function createCompactTractor(meshes: MeshFactory, { merge = true } = {}) {
  const root = new TransformNode(compactTractorSpec.name, meshes.scene)
  const body = vehicleBodywork(meshes, root)
  buildBody(body, meshes, root)
  buildOperatorStation(body, meshes)
  const lamps = vehicleLamps(meshes, root, compactTractorLights.head, compactTractorLights.tail)
  const { wheelRadius, halfTrack, axles: [rearAxle, frontAxle], rearTire, frontTire } = compactTractorSpec
  // Physics order: left rear, left front, right rear, right front.
  const wheels = sides.flatMap((side) => {
    const rear = mountVehicleWheel(meshes, root, side * halfTrack, wheelRadius, rearAxle, false)
    dressTractorWheel(meshes, rear.spin, side, wheelRadius, rearTire.depth)
    const front = mountVehicleWheel(meshes, root, side * frontTire.halfTrack, frontTire.radius, frontAxle, true, wheelRadius)
    dressTractorWheel(meshes, front.spin, side, frontTire.radius, frontTire.depth)
    return [rear, front]
  })
  if (merge) {
    batchRigidParts(meshes, root, lamps.meshes)
    for (const { spin } of wheels) batchRigidParts(meshes, spin)
  }
  return {
    root,
    setLights: lamps.set,
    pose: (rotation: number, steering: number, suspension?: readonly number[], blend = 1) =>
      poseVehicleWheels(wheels, rotation, steering, wheelRadius, suspension, blend),
  }
}
