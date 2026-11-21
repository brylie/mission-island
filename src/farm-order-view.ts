import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { FarmWork } from './farm-orders'
import type { MeshFactory } from './island-meshes'
import { moveTo } from './island-render-pose'
import { walkingHeight } from './terrain'
import { offset, type Pose } from './world'
import { barrowPickup, produceCounter } from './worlds/starter/farm-order-sites'

function sign({ scene, box }: MeshFactory, pose: Pose, text: string) {
  const root = new TransformNode(text, scene)
  root.position.set(pose.x, walkingHeight(pose), pose.z)
  root.rotation.y = pose.heading
  box(0, .48, 0, .075, .96, .075, '#6a5039', root)
  box(0, .93, 0, 1.05, .32, .1, '#6a5039', root)
  const label = new DynamicTexture(text, { width: 512, height: 128 }, scene, true)
  label.drawText(text, null, 85, 'bold 62px sans-serif', '#fcebd0', '#325b50')
  const face = new StandardMaterial(text, scene)
  face.diffuseTexture = label
  face.emissiveTexture = label
  box(0, .93, -.055, .99, .25, .012, face, root, false)
  box(0, .93, .055, .99, .25, .012, face, root, false)
  return root
}

export function createFarmOrderView(meshes: MeshFactory) {
  const { scene, box, cylinder } = meshes
  const stand = sign(meshes, { ...offset(barrowPickup, 1.05, 0), heading: .5 }, 'BARROW STAND')
  sign(meshes, { ...produceCounter, z: produceCounter.z - .15, heading: .32 }, 'PRODUCE ORDERS')
  const root = new TransformNode('Farm barrow', scene)
  const wheel = new TransformNode('Barrow wheel axle', scene)
  wheel.parent = root
  wheel.position.set(0, .26, .53)
  cylinder(0, 0, 0, .52, .52, .15, 20, '#343432', wheel).rotation.z = Math.PI / 2
  cylinder(0, 0, 0, .29, .29, .17, 14, '#bfa888', wheel).rotation.z = Math.PI / 2
  box(0, 0, 0, .183, .245, .036, '#68503f', wheel)
  for (const side of [-1, 1]) {
    const rail = box(side * .35, .74, .035, .061, .067, .94, '#796043', root)
    rail.rotation.set(.42, -side * .25, 0)
    box(side * .454, .925, -.375, .087, .088, .17, '#513f32', root).rotation.copyFrom(rail.rotation)
    box(side * .29, .24, -.33, .051, .48, .052, '#4f6560', root).rotation.z = side * .12
    box(side * .33, .69, -.02, .06, .26, .94, '#45776e', root).rotation.z = -side * .23
  }
  box(0, .57, -.02, .65, .078, .89, '#45776e', root)
  for (const end of [-1, 1]) box(0, .69, end * .46, .65, .26, .057, '#45776e', root).rotation.x = end * .26
  const carrots = Array.from({ length: 6 }, (_, i) => {
    const carrot = new TransformNode('Packed carrot', scene)
    carrot.parent = root
    carrot.position.set((i % 3 - 1) * .17, .665, i < 3 ? -.215 : .2)
    carrot.rotation.y = .35 - i * .12
    cylinder(0, 0, 0, .102, .02, .24, 8, '#f08434', carrot).rotation.x = Math.PI / 2
    box(0, .01, .136, .039, .04, .091, '#6b9a49', carrot).rotation.x = -.36
    return carrot
  })
  root.setEnabled(false)
  stand.setEnabled(false)

  return (work: FarmWork | undefined, factor: number) => {
    const barrow = work?.barrow
    stand.setEnabled(Boolean(barrow))
    if (!barrow || !work) {
      root.setEnabled(false)
      return
    }
    const step = Math.hypot(barrow.x - root.position.x, barrow.z - root.position.z)
    moveTo(root, barrow, walkingHeight(barrow), factor)
    if (step < 2 && barrow.handler !== null) wheel.rotation.x += step * factor / .26
    carrots.forEach((carrot, i) => carrot.setEnabled(i < work.progress.load))
  }
}
