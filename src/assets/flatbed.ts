import type { Material } from '@babylonjs/core/Materials/material'
import { SpotLight } from '@babylonjs/core/Lights/spotLight'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { surfaces } from '../materials'
import { flatbedBody, flatbedDeck, flatbedLights, flatbedWheelLayout, flatbedWheelTrim, truckBed, truckSideRails, truckTailLip } from './geometry/flatbed'

const sides = [-1, 1] as const
const half = 0.5
const quarterTurn = Math.PI * half
const diameterPerRadius = 2
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
      box(x, deckTop + railHeight * half, center + along, thickness + post.extraWidth, railHeight, post.depth, post.finish, truck)
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

export function createFlatbed(meshes: MeshFactory) {
  const { scene, box, cylinder, paint, paintSurface } = meshes
  const { radius, halfTrack, axles } = flatbedWheelLayout
  const { tire, hub } = flatbedWheelTrim
  const { chassis, hood, cab, windshield, sideWindow, mirror, bumpers } = flatbedBody
  const { head, tail } = flatbedLights
  const truck = new TransformNode('Flatbed', scene)
  const beam = createBeam(truck, 'Flatbed headlights', head.beam)
  beam.setEnabled(false)
  const brakeBeam = createBeam(truck, 'Flatbed brake lights', tail.beam)
  brakeBeam.intensity = tail.brakeIntensity
  brakeBeam.setEnabled(false)
  const lamps: { mesh: Mesh, lit: Material, unlit: Material, braking?: Material }[] = []
  const wheels: { axle: TransformNode, spin: TransformNode, steering: boolean }[] = []
  // The deck overhang keeps the joined side faces at distinct depths.
  box(0, chassis.y, 0, truckBed.width - chassis.sideInset, chassis.height, chassis.length, chassis.finish, truck).name = 'Chassis'
  box(...hood.center, ...hood.size, hood.finish, truck)
  box(...cab.center, ...cab.size, cab.finish, truck)
  box(...windshield.center, ...windshield.size, windshield.finish, truck)
  const tireDiameter = radius * diameterPerRadius
  for (const side of sides) {
    box(side * sideWindow.x, sideWindow.y, sideWindow.z, ...sideWindow.size, sideWindow.finish, truck)
    box(side * mirror.x, mirror.y, mirror.z, ...mirror.size, mirror.finish, truck)
    const front = head.lens, rear = tail.lens
    const headPaint = paint(front.unlit)
    const tailPaint = paint(rear.unlit)
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
      cylinder(0, 0, 0, tireDiameter, tireDiameter, tire.thickness, tire.segments, tire.finish, spin).rotation.z = quarterTurn
      cylinder(side * hub.x, 0, 0, hub.diameter, hub.diameter, hub.thickness, hub.segments, hub.finish, spin).rotation.z = quarterTurn
      wheels.push({ axle, spin, steering: index === frontAxleIndex })
    }
  }
  buildDeck(meshes, truck)
  for (const { center: [x, y, z], size: [width, height, length] } of bumpers) {
    box(x, y, z, width, height, length, paintSurface('metal', surfaces.metal.color), truck)
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
