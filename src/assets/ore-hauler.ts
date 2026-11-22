import type { Material } from '@babylonjs/core/Materials/material'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { haulerSpec, oreHaulerCab, oreHaulerChassis, oreHaulerTipper, oreHaulerWheel } from './geometry/ore-hauler'
import { batchRigidParts, dressFleetWheel, fleetPaint, vehicleBodywork, type VehicleBodywork, type VehicleProfile } from './vehicle-kit'

export { haulerSpec }

const ochre = '#e5a648'
const bedPaint = '#4d696c', ribPaint = '#73908e', liner = '#55635e', linerRunner = '#78837a'
const { frame, rubber, brightTrim: silver, bumper, tread, tank, roofCream: roof, windshield: glass, doorGlass } = fleetPaint
const sides = [-1, 1] as const
const half = 0.5
const quarterTurn = Math.PI * half

function buildCab({ box, panel }: VehicleBodywork, treadPlate: Material) {
  const cab = oreHaulerCab
  const { windows, door, mirror, steps, lights, grille } = cab
  panel('Cab sill and short bonnet', cab.sill.halfWidth, cab.sill.profile, ochre)
  panel('Raked cab', cab.envelope.halfWidth, cab.envelope.profile, ochre)
  panel('Folded cream roof', cab.roof.halfWidth, cab.roof.profile, roof)
  for (const side of sides) {
    // The divided windshield follows the same rake as the front pillars.
    box(windows.front, glass, side).rotation.x = windows.frontRake
    box(windows.wiper, frame, side).rotation.set(windows.frontRake, 0, windows.wiper.sweep)
    panel('Cab door glass', windows.door.halfWidth, windows.door.profile, doorGlass, side * windows.door.centerX)
    box(windows.divider, frame, side)
    box(door.handle, frame, side)
    box(door.trim, roof, side)
    const { centerX, halfWidth, ridgeHalfWidth, peak, ridge } = door.emblem
    panel('Slatecliff peak', halfWidth, peak, roof, side * centerX)
    panel('Slatecliff ridge', ridgeHalfWidth, ridge, roof, side * centerX)
    box(mirror.mount, frame, side)
    box(mirror.housing, frame, side)
    box(mirror.glass, silver, side)
    box(steps.top, treadPlate, side)
    box(steps.bottom, frame, side)
    box(lights.headlightHousing, frame, side)
    box(lights.headlightLens, fleetPaint.headlamp, side)
    box(lights.indicator, fleetPaint.indicator, side)
    box(lights.roofMarker, fleetPaint.roofMarker, side)
  }
  box(grille.surround, frame)
  for (const y of grille.bar.heights) box({ center: [0, y, grille.bar.z], size: grille.bar.size }, silver)
  box(cab.bumper, bumper)
  box(windows.rear, glass).rotation.x = windows.rear.rake
}

function buildTipper({ box, panel }: VehicleBodywork, metal: Material) {
  const tipper = oreHaulerTipper
  const { side: walls, tailgate } = tipper
  const { fender, tailLights, rearCrossmember, rearBracket, rearBumper } = oreHaulerChassis
  box(tipper.liner, liner)
  for (const side of sides) {
    const flare = side * walls.flare, wall = side * walls.centerX
    panel('Flared tipper side', walls.halfWidth, walls.profile, bedPaint, wall, flare)
    for (const z of walls.rib.centers) {
      const profile: VehicleProfile = walls.rib.profile.map(([offsetZ, y]) => [z + offsetZ, y])
      panel('Pressed side rib', walls.rib.halfWidth, profile, ribPaint, wall + side * walls.rib.outboard, flare)
    }
    box(walls.lipRail, ribPaint, side)
    box(walls.sill, frame, side)
    box(walls.linerRunner, linerRunner, side)
    // A fixed mudguard bridges the tandem wheels beneath the tipping body.
    box(fender.tandem, frame, side)
    box(fender.rearWing, frame, side).rotation.x = fender.rearWing.rake
    box(fender.frontWing, frame, side).rotation.x = fender.frontWing.rake
    box(fender.mudFlap, rubber, side)
    box(fender.front, ochre, side)
  }
  box(tailgate.plate, bedPaint).rotation.x = tailgate.rake
  box(tailgate.cap, ribPaint)
  for (const side of sides) {
    box(tailgate.stiffener, ribPaint, side).rotation.x = tailgate.rake
    box(tailgate.hinge, frame, side)
    box(tailgate.latch, metal, side)
    box(tailLights.housing, frame, side)
    box(tailLights.redLens, fleetPaint.tailRed, side)
    box(tailLights.amberLens, fleetPaint.tailAmber, side)
  }
  // Pale quarry chevrons also identify the truck from the chase camera.
  for (const side of sides) box(tailgate.chevron, roof, side).rotation.set(tailgate.rake, 0, side * tailgate.chevron.slant)
  box(tailgate.crossbar, ribPaint).rotation.x = tailgate.rake
  box(rearCrossmember, frame)
  for (const side of sides) box(rearBracket, frame, side)
  box(rearBumper, bumper)
  box(tipper.headboard, bedPaint)
  const { canopy, gusset } = tipper
  panel('Cab guard canopy', canopy.halfWidth, canopy.profile, ribPaint)
  for (const side of sides) panel('Guard gusset', gusset.halfWidth, gusset.profile, bedPaint, side * gusset.centerX)
}

function buildWheel(meshes: MeshFactory, root: TransformNode, side: number, z: number) {
  const { halfTrack, steeringAxle, tireDepth } = oreHaulerWheel
  const axle = new TransformNode('Hauler wheel steering', meshes.scene)
  axle.parent = root
  axle.position.set(side * halfTrack, haulerSpec.wheel, z)
  const wheel = new TransformNode('Hauler wheel spin', meshes.scene)
  wheel.parent = axle
  dressFleetWheel(meshes, wheel, side, haulerSpec.wheel, tireDepth)
  return { axle, wheel, steers: z === steeringAxle }
}

export function createOreHauler(meshes: MeshFactory, moving = false) {
  const root = new TransformNode(haulerSpec.name, meshes.scene)
  const body = vehicleBodywork(meshes, root, haulerSpec.cargo.floor)
  const metal = meshes.paintSurface('metal', tread)
  const { frame: frameBox, fuelTank } = oreHaulerChassis
  body.box(frameBox, frame)
  // The tank and its retaining straps sit between the cab steps and tandem bogie.
  for (const side of sides) {
    const [x, y, z] = fuelTank.center
    const { diameter, length, segments, straps } = fuelTank
    meshes.cylinder(side * x, y, z, diameter, diameter, length, segments, tank, root).rotation.x = quarterTurn
    for (const z of straps.positionsZ) meshes.cylinder(side * x, y, z, straps.diameter, straps.diameter, straps.width, segments, frame, root).rotation.x = quarterTurn
  }
  buildCab(body, metal)
  buildTipper(body, metal)
  const wheels = haulerSpec.axles.flatMap((z) => sides.map((side) => buildWheel(meshes, root, side, z)))
  if (moving) {
    batchRigidParts(meshes, root)
    for (const { wheel } of wheels) batchRigidParts(meshes, wheel)
  }
  function roll(distance: number, steering: number) {
    for (const { axle, wheel, steers } of wheels) {
      wheel.rotation.x += distance / haulerSpec.wheel
      if (steers) axle.rotation.y = steering
    }
  }
  return { root, roll }
}
