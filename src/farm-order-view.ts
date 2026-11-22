import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { barrowFeet, createBarrow } from './assets/barrow'
import { createFarmOrderSign } from './assets/farm'
import { barrowWheelGround } from './barrow-contact'
import { routeContactHeight } from './route-contact'
import { barrowRig, pushedBarrowPose } from './barrow'
import type { MeshFactory } from './island-meshes'
import { moveTo } from './island-render-pose'
import type { Snapshot } from './protocol'
import { distance, offset } from './world'
import { barrowPickup, produceCounter } from './worlds/starter/farm-order-sites'

const barrowSignOffset = 1.2
const barrowSignHeading = 0.5
const produceSignOffset = 0.15
const produceSignHeading = 0.32
const avatarAttachmentTolerance = 0.03
const wheelMotionLimit = 0.42
const packedCarrotDrop = 0.15
const packedCarrotStagger = 0.035

export function createFarmOrderView(meshes: MeshFactory, crew: readonly TransformNode[]) {
  const stand = createFarmOrderSign(meshes, { ...offset(barrowPickup, barrowSignOffset, 0), heading: barrowSignHeading }, 'BARROW STAND')
  createFarmOrderSign(meshes, { ...produceCounter, z: produceCounter.z - produceSignOffset, heading: produceSignHeading }, 'PRODUCE ORDERS')
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
    const attached = handler && avatar?.isEnabled() && distance(pushedBarrowPose(handler), barrow) < avatarAttachmentTolerance ? avatar : undefined
    const pose = attached ? pushedBarrowPose({ x: attached.position.x, z: attached.position.z, heading: attached.rotation.y }) : barrow
    const ground = barrowWheelGround(pose)
    moveTo(root, pose, ground, attached ? 1 : factor)
    const supportingGround = Math.max(...[-barrowFeet.halfWidth, barrowFeet.halfWidth].map((x) => routeContactHeight(offset(pose, x, barrowFeet.z))))
    const pitch = Math.atan2(supportingGround - ground, wheelZ - barrowFeet.z) + (barrow.handler === null ? 0 : lift)
    tilt.rotation.x += (pitch - tilt.rotation.x) * (initialized ? factor : 1)
    if (initialized && barrow.handler !== null && barrow.handler === previousHandler && Math.hypot(root.position.x - x, root.position.z - z) < wheelMotionLimit) {
      const forward = (root.position.x - x) * Math.sin(root.rotation.y) + (root.position.z - z) * Math.cos(root.rotation.y)
      wheel.rotation.x += forward / wheelRadius
    }
    previousHandler = barrow.handler
    for (const [i, { carrot, y }] of carrots.entries()) {
      const visible = i < work.progress.load
      if (visible && !carrot.isEnabled()) carrot.position.y = y + (initialized ? packedCarrotDrop + i * packedCarrotStagger : 0)
      carrot.setEnabled(visible)
      if (visible) carrot.position.y += (y - carrot.position.y) * factor
    }
  }
}
