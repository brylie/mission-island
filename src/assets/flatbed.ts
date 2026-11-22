import type { Material } from '@babylonjs/core/Materials/material'
import { SpotLight } from '@babylonjs/core/Lights/spotLight'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { flatbedBody, flatbedDeck, flatbedLights, flatbedTireDepth, flatbedWheelLayout, truckBed, truckSideRails, truckTailLip } from './geometry/flatbed'
import { batchRigidParts, dressFleetWheel, fleetPaint, vehicleBodywork, type VehicleBodywork } from './vehicle-kit'

const sides = [-1, 1] as const
const half = 0.5
const quarterTurn = Math.PI * half
const frontAxleIndex = 1
const headlightEnableThreshold = 0.04
const headlightIntensityGain = 2.3

type Beam = typeof flatbedLights[keyof typeof flatbedLights]['beam']

function createBeam(truck: TransformNode, name: string, { at, direction, angle, exponent, color, range }: Beam) {
  const beam = new SpotLight(name, Vector3.FromArray(at), Vector3.FromArray(direction), angle, exponent, truck.getScene())
  beam.parent = truck
  beam.diffuse = Color3.FromHexString(color)
  beam.range = range
  return beam
}

function buildDeck({ box, paintSurface }: MeshFactory, truck: TransformNode) {
  const { renderInset, thickness: deckThickness, finish, seams, sideRails } = flatbedDeck
  const { top, center, width, length } = truckBed
  const deckTop = top - renderInset
  box(0, deckTop - deckThickness * half, center, width, deckThickness, length, finish, truck).name = 'Deck'
  for (const x of seams.x) {
    box(x, deckTop + seams.lift, center, seams.width, seams.height, length - seams.endInset, seams.finish, truck, false)
  }

  const { x: railX, height: railHeight, thickness } = truckSideRails
  const { post, lowerBoard, upperBoard } = sideRails
  const planks = paintSurface('wood', sideRails.finish)
  const endPost = (length - post.depth) * half
  const posts = [-endPost, 0, endPost]
  const joint = post.depth * half + post.jointGap
  for (const side of sides) {
    const x = side * railX
    for (const along of posts) {
      box(x, deckTop + railHeight * half, center + along, thickness + post.extraWidth, railHeight, post.depth, fleetPaint.frame, truck)
    }
    for (let i = 1; i < posts.length; i++) {
      const start = posts[i - 1] + joint
      const end = posts[i] - joint
      const boardZ = center + (start + end) * half
      box(x, deckTop + lowerBoard.rise, boardZ, thickness, lowerBoard.height, end - start, planks, truck)
      box(x, deckTop + railHeight - upperBoard.drop, boardZ, thickness, upperBoard.height, end - start, planks, truck)
    }
  }
  box(0, deckTop + truckTailLip.height * half, truckTailLip.z, width, truckTailLip.height, truckTailLip.thickness, planks, truck)
}

function buildCab({ box, panel }: VehicleBodywork, treadPlate: Material) {
  const { finish, bonnet, nose, cab, roof, windows, door, mirror, steps, roofMarker, grille, headlightHousing, indicator, frontFender, frontBumper } = flatbedBody
  panel('Flatbed bonnet and sill', bonnet.halfWidth, bonnet.profile, finish)
  panel('Flatbed nose', nose.halfWidth, nose.profile, finish)
  panel('Flatbed raked cab', cab.halfWidth, cab.profile, finish)
  panel('Flatbed cream roof', roof.halfWidth, roof.profile, fleetPaint.roofCream)
  box(windows.rear, fleetPaint.windshield)
  for (const side of sides) {
    box(windows.front, fleetPaint.windshield, side).rotation.x = windows.rake
    box(windows.wiper, fleetPaint.frame, side).rotation.set(windows.rake, 0, side * windows.wiper.sweep)
    panel('Flatbed door glass', windows.door.halfWidth, windows.door.profile, fleetPaint.doorGlass, side * windows.door.centerX)
    box(door.handle, fleetPaint.frame, side)
    box(door.coachline, fleetPaint.roofCream, side)
    const { emblem } = door
    panel('Harbor Depot sun', emblem.halfWidth, emblem.sun, fleetPaint.roofCream, side * emblem.centerX)
    box(emblem.horizon, fleetPaint.roofCream, side)
    box(mirror.mount, fleetPaint.frame, side)
    box(mirror.housing, fleetPaint.frame, side)
    box(mirror.glass, fleetPaint.brightTrim, side)
    box(steps.tread, treadPlate, side)
    box(steps.bracket, fleetPaint.frame, side)
    for (const z of steps.hanger.z) box({ center: [steps.hanger.x, steps.hanger.y, z], size: steps.hanger.size }, fleetPaint.frame, side)
    box(roofMarker, fleetPaint.roofMarker, side)
    box(headlightHousing, fleetPaint.frame, side)
    box(indicator, fleetPaint.indicator, side)
    box(frontFender, fleetPaint.frame, side)
  }
  box(grille.surround, fleetPaint.frame)
  for (const y of grille.bar.heights) box({ center: [0, y, grille.bar.z], size: grille.bar.size }, fleetPaint.brightTrim)
  box(frontBumper, fleetPaint.bumper)
}

function buildRunningGear({ box }: VehicleBodywork, meshes: MeshFactory, truck: TransformNode, treadPlate: Material) {
  const { frame, rear, rearFender, fuelTank, toolLocker, cabGuard } = flatbedBody
  box(frame, fleetPaint.frame)
  box(rear.crossmember, fleetPaint.frame)
  box(rear.bumper, fleetPaint.bumper)
  for (const side of sides) {
    box(rear.bracket, fleetPaint.frame, side)
    box(rear.lightHousing, fleetPaint.frame, side)
    box(rear.amberLens, fleetPaint.tailAmber, side)
    box(rearFender.top, fleetPaint.frame, side)
    box(rearFender.frontWing, fleetPaint.frame, side).rotation.x = rearFender.frontWing.rake
    box(rearFender.rearWing, fleetPaint.frame, side).rotation.x = rearFender.rearWing.rake
    box(rearFender.mudFlap, fleetPaint.rubber, side)
  }
  const [x, y, z] = fuelTank.center
  const { diameter, length, segments, straps } = fuelTank
  meshes.cylinder(x, y, z, diameter, diameter, length, segments, fleetPaint.tank, truck).rotation.x = quarterTurn
  for (const strapZ of straps.z) {
    meshes.cylinder(x, y, strapZ, straps.diameter, straps.diameter, straps.width, segments, fleetPaint.frame, truck).rotation.x = quarterTurn
  }
  box(toolLocker.body, fleetPaint.bumper)
  box(toolLocker.latch, treadPlate)
  for (const postX of cabGuard.posts.x) box({ center: [postX, cabGuard.posts.center[1], cabGuard.posts.center[2]], size: cabGuard.posts.size }, fleetPaint.frame)
  for (const railY of cabGuard.rails.heights) box({ center: [0, railY, cabGuard.rails.center[2]], size: cabGuard.rails.size }, fleetPaint.frame)
}

// Merging is on by default. Workbench inspection keeps parts separate so the
// z-fighting check can name each one.
export function createFlatbed(meshes: MeshFactory, { merge = true } = {}) {
  const { scene, box, paint } = meshes
  const { radius, halfTrack, axles } = flatbedWheelLayout
  const { head, tail } = flatbedLights
  const truck = new TransformNode('Flatbed', scene)
  const beam = createBeam(truck, 'Flatbed headlights', head.beam)
  beam.setEnabled(false)
  const brakeBeam = createBeam(truck, 'Flatbed brake lights', tail.beam)
  brakeBeam.intensity = tail.brakeIntensity
  brakeBeam.setEnabled(false)
  const lamps: { mesh: Mesh, lit: Material, unlit: Material, braking?: Material }[] = []
  const wheels: { axle: TransformNode, spin: TransformNode, steering: boolean }[] = []
  const body = vehicleBodywork(meshes, truck)
  const treadPlate = meshes.paintSurface('metal', fleetPaint.tread)
  buildCab(body, treadPlate)
  buildRunningGear(body, meshes, truck, treadPlate)
  const headPaint = paint(fleetPaint.headlamp)
  const tailPaint = paint(fleetPaint.tailRed)
  for (const side of sides) {
    const front = head.lens, rear = tail.lens
    lamps.push(
      { mesh: box(side * front.x, front.y, front.z, ...front.size, headPaint, truck), unlit: headPaint, lit: paint(front.lit, true) },
      {
        mesh: box(side * rear.x, rear.y, rear.z, ...rear.size, tailPaint, truck),
        unlit: tailPaint,
        lit: paint(rear.lit, true),
        braking: paint(rear.braking, true),
      },
    )
    for (const [index, z] of axles.entries()) {
      const axle = new TransformNode('Wheel steering', scene)
      axle.parent = truck
      axle.position.set(side * halfTrack, radius, z)
      const spin = new TransformNode('Wheel spin', scene)
      spin.parent = axle
      dressFleetWheel(meshes, spin, side, radius, flatbedTireDepth)
      wheels.push({ axle, spin, steering: index === frontAxleIndex })
    }
  }
  buildDeck(meshes, truck)
  // Rigid parts merge by finish. Lamps keep their own meshes because they
  // swap materials when lit.
  if (merge) {
    batchRigidParts(meshes, truck, new Set(lamps.map(({ mesh }) => mesh)))
    for (const { spin } of wheels) batchRigidParts(meshes, spin)
  }
  return {
    root: truck,
    wheels,
    setLights(strength: number, braking = false) {
      const lit = strength > headlightEnableThreshold
      beam.setEnabled(lit)
      beam.intensity = strength * headlightIntensityGain
      brakeBeam.setEnabled(braking)
      for (const lamp of lamps) lamp.mesh.material = braking && lamp.braking ? lamp.braking : lit ? lamp.lit : lamp.unlit
    },
  }
}

export function poseFlatbed(truck: ReturnType<typeof createFlatbed>, rotation: number, steering: number, suspension?: number[], blend = 1) {
  for (const [index, wheel] of truck.wheels.entries()) {
    wheel.spin.rotation.x = rotation
    wheel.axle.rotation.y = wheel.steering ? steering : 0
    wheel.axle.position.y += ((suspension?.[index] ?? flatbedWheelLayout.radius) - wheel.axle.position.y) * blend
  }
}
