import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { createCrewGait } from './crew-gait'
import { distanceToRoute, road, roadHeight, sidewalkHeight, walkways } from './routes'
import { walkingHeight } from './terrain'
import type { Point, Pose } from './world'

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

function visualFloor(point: Point) {
  if (point.x >= 29 && point.x <= 52 && point.z >= 4 && point.z <= 20 &&
      walkways.some(path => distanceToRoute(point, path.points) <= path.width / 2)) return sidewalkHeight
  if (point.x >= -55 && point.x <= 51 && point.z >= -14 && point.z <= 15 &&
      distanceToRoute(point, road) <= 3) return roadHeight
  return walkingHeight(point)
}

export function sampleWalkingGait(gait: ReturnType<typeof createCrewGait>, node: TransformNode, delta: number) {
  const { x, y, z } = node.position
  return gait.sample({ x, y, z, heading: node.rotation.y }, delta, visualFloor)
}
