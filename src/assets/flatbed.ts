import type { Material } from '@babylonjs/core/Materials/material'
import { SpotLight } from '@babylonjs/core/Lights/spotLight'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { surfaces } from '../materials'
import { flatbedGroundDrive } from '../vehicles/flatbed'
import { truckBed, truckSideRails, truckTailLip } from '../world'

export function createFlatbed({ scene, box, cylinder, paint, paintSurface }: MeshFactory) {
  const { radius, halfTrack, axles } = flatbedGroundDrive.wheels
  const truck = new TransformNode('Flatbed', scene)
  const beam = new SpotLight('Flatbed headlights', new Vector3(0, 1.1, 2.98), new Vector3(0, -0.10, 1), 0.9, 1.1, scene)
  beam.parent = truck
  beam.diffuse = Color3.FromHexString('#ffe9ad')
  beam.range = 28
  beam.setEnabled(false)
  const brakeBeam = new SpotLight('Flatbed brake lights', new Vector3(0, 0.57, -3.12),
    new Vector3(0, -0.28, -1), 1.5, 1.4, scene)
  brakeBeam.parent = truck
  brakeBeam.diffuse = Color3.FromHexString('#ff391f')
  brakeBeam.range = 5
  brakeBeam.intensity = 2.2
  brakeBeam.setEnabled(false)
  const lamps: { mesh: Mesh; lit: Material; unlit: Material; braking?: Material }[] = []
  const wheels: { axle: TransformNode; spin: TransformNode; steering: boolean }[] = []
  // The deck overhang keeps the joined side faces at distinct depths.
  box(0, 0.68, 0, truckBed.width - 0.16, 0.53, 5.7, '#374848', truck).name = 'Chassis'
  box(0, 1.09, 1.55, 2.46, 0.68, 2.63, '#f5bc54', truck)
  box(0, 1.75, 1.03, 2.36, 1.1, 1.52, '#edae45', truck)
  box(0, 1.9, 1.8, 1.96, 0.62, 0.07, '#426976', truck)
  for (const side of [-1, 1]) {
    box(side * 1.19, 1.91, 1.02, 0.07, 0.6, 1.18, '#557b83', truck)
    box(side * 1.33, 1.6, 1.58, 0.26, 0.27, 0.3, '#435853', truck)
    const head = paint('#fff4c1')
    const tail = paint('#be5848')
    lamps.push(
      { mesh: box(side * 0.86, 1.08, 2.9, 0.47, 0.25, 0.09, head, truck), unlit: head, lit: paint('#fff3b0', true) },
      { mesh: box(side * 0.89, 0.57, -3.065, 0.33, 0.17, 0.042, tail, truck),
        unlit: tail, lit: paint('#c83832', true), braking: paint('#ff7763', true) },
    )
    for (const [index, z] of axles.entries()) {
      const axle = new TransformNode('Wheel steering', scene)
      axle.parent = truck
      axle.position.set(side * halfTrack, radius, z)
      const spin = new TransformNode('Wheel spin', scene)
      spin.parent = axle
      cylinder(0, 0, 0, radius * 2, radius * 2, 0.46, 14, '#253834', spin).rotation.z = Math.PI / 2
      cylinder(side * 0.24, 0, 0, 0.42, 0.42, 0.04, 10, '#9aab9d', spin).rotation.z = Math.PI / 2
      wheels.push({ axle, spin, steering: index === 1 })
    }
  }
  box(0, truckBed.top - 0.155, truckBed.center, truckBed.width, 0.19, truckBed.length, '#a97e54', truck).name = 'Deck'
  for (const x of [-0.68, -0.23, 0.23, 0.68]) {
    box(x, truckBed.top - 0.058, truckBed.center, 0.025, 0.015, truckBed.length - 0.045, '#8b6746', truck, false)
  }
  const railBase = truckBed.top - 0.06
  const { x: railX, height: railHeight, thickness } = truckSideRails
  const planks = paintSurface('wood', '#b18c61')
  const postDepth = 0.12
  const endPost = (truckBed.length - postDepth) / 2
  const posts = [-endPost, 0, endPost]
  const joint = postDepth / 2 + 0.012
  for (const side of [-1, 1]) {
    const x = side * railX
    for (const along of posts) {
      box(x, railBase + railHeight / 2, truckBed.center + along,
        thickness + 0.036, railHeight, postDepth, '#415653', truck)
    }
    for (let i = 1; i < posts.length; i++) {
      const start = posts[i - 1] + joint
      const end = posts[i] - joint
      const center = truckBed.center + (start + end) / 2
      box(x, railBase + 0.21, center, thickness, 0.16, end - start, planks, truck)
      box(x, railBase + railHeight - 0.085, center, thickness, 0.17, end - start, planks, truck)
    }
  }
  box(0, railBase + truckTailLip.height / 2, truckTailLip.z,
    truckBed.width, truckTailLip.height, truckTailLip.thickness, planks, truck)
  box(0, 0.61, 2.87, 2.51, 0.27, 0.2, paintSurface('metal', surfaces.metal.color), truck)
  box(0, 0.56, -2.94, 2.52, 0.24, 0.2, paintSurface('metal', surfaces.metal.color), truck)
  return {
    root: truck, wheels,
    setLights(strength: number, braking = false) {
      const lit = strength > 0.04
      beam.setEnabled(lit)
      beam.intensity = strength * 2.3
      brakeBeam.setEnabled(braking)
      for (const lamp of lamps) lamp.mesh.material = braking && lamp.braking ? lamp.braking : lit ? lamp.lit : lamp.unlit
    },
  }
}

export function poseFlatbed(truck: ReturnType<typeof createFlatbed>, rotation: number, steering: number,
  suspension?: number[], blend = 1,
) {
  for (const [index, wheel] of truck.wheels.entries()) {
    wheel.spin.rotation.x = rotation
    wheel.axle.rotation.y = wheel.steering ? steering : 0
    wheel.axle.position.y += ((suspension?.[index] ?? flatbedGroundDrive.wheels.radius) - wheel.axle.position.y) * blend
  }
}
