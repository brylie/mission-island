import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createBarrow } from './assets/barrow'
import { barrowWheelGround } from './barrow-contact'
import { routeContactHeight } from './route-contact'
import { barrowRig, pushedBarrowPose } from './barrow'
import type { MeshFactory } from './island-meshes'
import { moveTo } from './island-render-pose'
import type { Snapshot } from './protocol'
import { walkingHeight } from './terrain'
import { distance, offset, type Pose } from './world'
import { barrowPickup, produceCounter } from './worlds/starter/farm-order-sites'

function sign({ scene, box, surface }: MeshFactory, pose: Pose, text: string) {
  const root = new TransformNode(text, scene)
  root.position.set(pose.x, walkingHeight(pose), pose.z)
  root.rotation.y = pose.heading
  box(0, 0.48, 0, 0.075, 0.96, 0.075, '#6a5039', root)
  box(0, 0.93, 0, 1.05, 0.32, 0.1, '#6a5039', root)
  const label = new DynamicTexture(text, { width: 512, height: 128 }, scene, true)
  label.drawText(text, null, 85, 'bold 62px sans-serif', '#fcebd0', '#325b50', true)
  const face = new StandardMaterial(text, scene)
  face.diffuseTexture = label
  face.emissiveTexture = label
  face.backFaceCulling = false
  for (const side of [-1, 1]) {
    const left = side * 0.495, z = side * 0.052
    surface(`${text} face`, [left, 0.805, z, -left, 0.805, z, -left, 1.055, z, left, 1.055, z], [0, 1, 2, 0, 2, 3], face, root, [0, 0, 1, 0, 1, 1, 0, 1])
  }
  return root
}

export function createFarmOrderView(meshes: MeshFactory, crew: readonly TransformNode[]) {
  const stand = sign(meshes, { ...offset(barrowPickup, 1.2, 0), heading: 0.5 }, 'BARROW STAND')
  sign(meshes, { ...produceCounter, z: produceCounter.z - 0.15, heading: 0.32 }, 'PRODUCE ORDERS')
  const { root, tilt, wheel, carrots } = createBarrow(meshes)
  stand.setEnabled(false)
  let previousHandler: number | null = null

  return (state: Snapshot | undefined, factor: number) => {
    const work = state?.farmWork
    const barrow = work?.barrow
    stand.setEnabled(Boolean(barrow))
    if (!barrow || !work) {
      root.setEnabled(false)
      return
    }
    const { x, z } = root.position
    const initialized = root.isEnabled()
    const { wheelRadius, wheelZ, lift } = barrowRig
    const handler = state?.players.find((player) => player.id === barrow.handler)
    const avatar = handler && crew[handler.id]
    // The cart follows the avatar's turn around its handles. Interpolating their world positions
    // separately would shorten the gap between them during a sharp turn.
    const attached = handler && avatar?.isEnabled() && distance(pushedBarrowPose(handler), barrow) < 0.03 ? avatar : undefined
    const pose = attached ? pushedBarrowPose({ x: attached.position.x, z: attached.position.z, heading: attached.rotation.y }) : barrow
    const ground = barrowWheelGround(pose)
    moveTo(root, pose, ground, attached ? 1 : factor)
    const supportingGround = Math.max(...[-0.326, 0.326].map((x) => routeContactHeight(offset(pose, x, -0.355))))
    const pitch = Math.atan2(supportingGround - ground, wheelZ + 0.355) + (barrow.handler === null ? 0 : lift)
    tilt.rotation.x += (pitch - tilt.rotation.x) * (initialized ? factor : 1)
    if (initialized && barrow.handler !== null && barrow.handler === previousHandler && Math.hypot(root.position.x - x, root.position.z - z) < 0.42) {
      const forward = (root.position.x - x) * Math.sin(root.rotation.y) + (root.position.z - z) * Math.cos(root.rotation.y)
      wheel.rotation.x += forward / wheelRadius
    }
    previousHandler = barrow.handler
    for (const [i, { carrot, y }] of carrots.entries()) {
      const visible = i < work.progress.load
      if (visible && !carrot.isEnabled()) carrot.position.y = y + (initialized ? 0.15 + i * 0.035 : 0)
      carrot.setEnabled(visible)
      if (visible) carrot.position.y += (y - carrot.position.y) * factor
    }
  }
}
