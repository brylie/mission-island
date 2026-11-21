import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { gullAt } from '../gull-flight'
import type { MeshFactory } from '../island-meshes'

export function createGull(meshes: MeshFactory, index: number) {
  const root = new TransformNode('Harbor gull ' + (index + 1), meshes.scene)
  const body = new TransformNode('Gull body', meshes.scene)
  body.parent = root
  const ivory = '#f4e9d4', pale = '#b8c1bd', tips = '#4b5558', gold = '#deaa57'
  meshes.sphere(0, 0, 0, 0.26, 0.21, 0.52, ivory, body, false, 8)
  meshes.sphere(0, 0.118, 0.207, 0.176, 0.185, 0.197, ivory, body, false, 7)
  meshes.sphere(0, 0.056, 0.159, 0.173, 0.21, 0.20, ivory, body, false, 7)
  const beak = meshes.cylinder(0, 0.096, 0.337, 0.026, 0.079, 0.119, 6, gold, body, false)
  beak.rotation.x = Math.PI / 2
  for (const side of [-1, 1]) {
    meshes.sphere(side * 0.079, 0.144, 0.254, 0.028, 0.029, 0.032, '#353b38', body, false, 6)
  }
  const feathers = (name: string, vertices: number[], color: string, parent: TransformNode) => {
    const paint = meshes.paint(color)
    paint.backFaceCulling = false
    return meshes.surface(name, vertices, [0, 1, 2, 0, 2, 3, 0, 3, 4], paint, parent)
  }
  feathers('Gull tail', [-0.064, 0.012, -0.179, 0.063, 0.014, -0.181, 0.089, 0.012, -0.354, 0, 0.032, -0.397, -0.089, 0.01, -0.354], ivory, body)
  const wings = [-1, 1].map((side) => {
    const shoulder = new TransformNode('Gull shoulder', meshes.scene)
    shoulder.parent = body
    shoulder.position.set(side * 0.082, 0.057, 0.065)
    feathers('Gull inner wing', [0, 0, 0.131, side * 0.29, 0.035, 0.106, side * 0.425, 0.02, 0.014, side * 0.307, -0.021, -0.15, 0, -0.038, -0.166], pale, shoulder)
    const primary = new TransformNode('Gull wingtip hinge', meshes.scene)
    primary.parent = shoulder
    primary.position.set(side * 0.318, 0.02, 0.026)
    feathers('Tapered primary feathers', [0, 0.017, 0.081, side * 0.232, 0.018, 0.049, side * 0.391, 0, -0.076, side * 0.245, -0.015, -0.106, 0, -0.039, -0.151], tips, primary)
    meshes.sphere(side * 0.237, 0.024, -0.018, 0.107, 0.012, 0.054, ivory, primary, false, 5)
    return { side, shoulder, primary }
  })
  const legs = new TransformNode('Gull legs and webbed toes', meshes.scene)
  legs.parent = root
  for (const x of [-0.064, 0.064]) {
    meshes.cylinder(x, 0.071, -0.019, 0.023, 0.025, 0.137, 6, gold, legs, false)
    meshes.sphere(x, 0.0155, 0.023, 0.079, 0.031, 0.117, gold, legs, false, 6)
  }
  return {
    root,
    pose(sample: ReturnType<typeof gullAt>) {
      root.position.set(sample.x, sample.y, sample.z)
      root.rotation.y = sample.heading
      body.position.y = 0.205 - sample.crouch
      body.rotation.set(sample.pitch, 0, sample.bank)
      legs.position.y = sample.tuck * 0.132
      legs.rotation.x = -0.66 * sample.tuck
      for (const { side, shoulder, primary } of wings) {
        shoulder.rotation.y = side * (sample.sweep + sample.fold * 1.32)
        shoulder.rotation.z = side * (sample.flap - sample.fold * 0.16)
        shoulder.scaling.x = 1 - sample.fold * 0.31
        primary.rotation.y = side * (0.085 + sample.fold * 0.92)
        primary.rotation.z = side * (-sample.flap * 0.41 - sample.fold * 0.04)
      }
    },
  }
}
