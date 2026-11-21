import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { barrowWalk } from './barrow-gait'
import type { Pose } from './world'

export function walkGait(step: number, elapsed: number, pushing: boolean) {
  const speed = elapsed > 0 ? step / elapsed : 0
  return {
    cycles: step / (pushing ? barrowWalk.cycleMetres : 4.8),
    stride: pushing ? Math.min(1, speed / .9) : Math.min(.92, speed * .072),
  }
}

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
