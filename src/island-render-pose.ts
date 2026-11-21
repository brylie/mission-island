import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { barrowWalk } from './barrow-gait.ts'
import { crewHipHeight } from './world.ts'
import type { Pose } from './world.ts'

// How far each leg swings from vertical, in radians, grows with pace up to
// the widest stride the model can take.
const swingPerPace = 0.072
const widestSwing = 0.92
const narrowestSwing = 0.05
// The pace at which a crew member pushing the barrow reaches a full stride.
const barrowFullStridePace = 0.9

export const crewSwing = (pace: number) => Math.min(widestSwing, pace * swingPerPace)

// The legs swing as a sine, so the supporting foot moves back fastest as it
// passes under the hip. Over this distance per cycle that speed equals the
// pace over the ground, so the foot keeps up with it.
export const strideCycleMetres = (swing: number) => 2 * Math.PI * crewHipHeight * Math.max(narrowestSwing, swing)

export function walkGait(step: number, elapsed: number, pushing: boolean) {
  const pace = elapsed > 0 ? step / elapsed : 0
  const stride = pushing ? Math.min(1, pace / barrowFullStridePace) : crewSwing(pace)
  return { cycles: step / (pushing ? barrowWalk.cycleMetres : strideCycleMetres(stride)), stride }
}

// Past this distance a node is placed at its new pose without easing.
const placeBeyondMetres = 14

export function moveTo(node: TransformNode, pose: Pose, y: number, factor: number) {
  if (!node.isEnabled() || Math.hypot(node.position.x - pose.x, node.position.z - pose.z) > placeBeyondMetres) {
    node.position.set(pose.x, y, pose.z)
    node.rotation.y = pose.heading
  }
  else {
    node.position.x += (pose.x - node.position.x) * factor
    node.position.y += (y - node.position.y) * factor
    node.position.z += (pose.z - node.position.z) * factor
    const turn = pose.heading - node.rotation.y
    node.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * factor
  }
  node.setEnabled(true)
}
