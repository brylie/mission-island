import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Pose } from './world'

export function moveTo(node: TransformNode, pose: Pose, y: number, factor: number) {
  if (!node.isEnabled() || Math.hypot(node.position.x - pose.x, node.position.z - pose.z) > 14) {
    node.position.set(pose.x, y, pose.z)
    node.rotation.y = pose.heading
  } else {
    node.position.x += (pose.x - node.position.x) * factor
    node.position.y += (y - node.position.y) * factor
    node.position.z += (pose.z - node.position.z) * factor
    const turn = pose.heading - node.rotation.y
    node.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * factor
  }
  node.setEnabled(true)
}
