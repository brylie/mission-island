import type { Skiff } from '../protocol'
import { waterDepth } from '../terrain.ts'
import { offset, type Point, type Pose } from '../world.ts'

const wakeSpeed = 5.8
const minimumSpeed = 0.04
const replayDuration = 4

const reverseWakeOffset = 2.25
const forwardWakeOffset = -2.1
const demoStartX = 4.8
const demoZ = -0.65
const half = 0.5
const fullTurn = Math.PI + Math.PI
const demoHeading = -Math.PI * half

export function movingWakeStrength(speed: number) {
  const magnitude = Math.abs(speed)
  return magnitude <= minimumSpeed ? 0 : Math.min(1, magnitude / wakeSpeed)
}

export function wakeStrength(skiff: Skiff, rendered: Pose = skiff) {
  const strength = movingWakeStrength(skiff.speed)
  if (!strength || waterDepth(skiff) <= 0 || waterDepth(rendered) <= 0) return 0
  const source = offset(rendered, 0, skiff.speed < 0 ? reverseWakeOffset : forwardWakeOffset)
  return waterDepth(source) > 0 ? strength : 0
}

export function skiffStudyPose(origin: Point, time = 0, response = 0): Skiff {
  const phase = (time % replayDuration) / replayDuration
  const angle = phase * fullTurn
  const travel = phase - Math.sin(angle) / fullTurn
  return {
    x: origin.x + demoStartX - travel * response * wakeSpeed * replayDuration * half,
    z: origin.z + demoZ,
    heading: demoHeading,
    speed: response * wakeSpeed * (1 - Math.cos(angle)) * half,
  }
}
