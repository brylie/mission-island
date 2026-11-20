import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { gullAt } from '../gull-flight'
import type { MeshFactory } from '../island-meshes'

export function createGull(meshes: MeshFactory, index: number) {
  const root = new TransformNode('Harbor gull ' + (index + 1), meshes.scene)
  const body = new TransformNode('Gull body', meshes.scene)
  body.parent = root
  const ivory = '#f4e9d4', pale = '#b8c1bd', tips = '#4b5558', gold = '#deaa57'
  meshes.sphere(0, 0, 0, .26, .21, .52, ivory, body, false, 8)
  meshes.sphere(0, .118, .207, .176, .185, .197, ivory, body, false, 7)
  meshes.sphere(0, .056, .159, .173, .21, .20, ivory, body, false, 7)
  const beak = meshes.cylinder(0, .096, .337, .026, .079, .119, 6, gold, body, false)
  beak.rotation.x = Math.PI / 2
  for (const side of [-1, 1]) {
    meshes.sphere(side * .079, .144, .254, .028, .029, .032, '#353b38', body, false, 6)
  }
  const feathers = (name: string, vertices: number[], color: string, parent: TransformNode) => {
    const paint = meshes.paint(color)
    paint.backFaceCulling = false
    return meshes.surface(name, vertices, [0, 1, 2, 0, 2, 3, 0, 3, 4], paint, parent)
  }
  feathers('Gull tail', [-.064, .012, -.179, .063, .014, -.181, .089, .012, -.354, 0, .032, -.397, -.089, .01, -.354],
    ivory, body)
  const wings = [-1, 1].map(side => {
    const shoulder = new TransformNode('Gull shoulder', meshes.scene)
    shoulder.parent = body
    shoulder.position.set(side * .082, .057, .065)
    feathers('Gull inner wing', [0, 0, .131, side * .29, .035, .106, side * .425, .02, .014,
      side * .307, -.021, -.15, 0, -.038, -.166], pale, shoulder)
    const primary = new TransformNode('Gull wingtip hinge', meshes.scene)
    primary.parent = shoulder
    primary.position.set(side * .318, .02, .026)
    feathers('Tapered primary feathers', [0, .017, .081, side * .232, .018, .049, side * .391, 0, -.076,
      side * .245, -.015, -.106, 0, -.039, -.151], tips, primary)
    meshes.sphere(side * .237, .024, -.018, .107, .012, .054, ivory, primary, false, 5)
    return { side, shoulder, primary }
  })
  const legs = new TransformNode('Gull legs and webbed toes', meshes.scene)
  legs.parent = root
  for (const x of [-.064, .064]) {
    meshes.cylinder(x, .071, -.019, .023, .025, .137, 6, gold, legs, false)
    meshes.sphere(x, .0155, .023, .079, .031, .117, gold, legs, false, 6)
  }
  return {
    root,
    pose(sample: ReturnType<typeof gullAt>) {
      root.position.set(sample.x, sample.y, sample.z)
      root.rotation.y = sample.heading
      body.position.y = .205 - sample.crouch
      body.rotation.set(sample.pitch, 0, sample.bank)
      legs.position.y = sample.tuck * .132
      legs.rotation.x = -.66 * sample.tuck
      for (const { side, shoulder, primary } of wings) {
        shoulder.rotation.y = side * (sample.sweep + sample.fold * 1.32)
        shoulder.rotation.z = side * (sample.flap - sample.fold * .16)
        shoulder.scaling.x = 1 - sample.fold * .31
        primary.rotation.y = side * (.085 + sample.fold * .92)
        primary.rotation.z = side * (-sample.flap * .41 - sample.fold * .04)
      }
    },
  }
}
