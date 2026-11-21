import type { Skiff } from '../protocol'
import { waterDepth } from '../terrain.ts'
import { offset, type Point, type Pose } from '../world.ts'

const wakeSpeed = 5.8
const minimumSpeed = 0.04
const replayDuration = 4

export function movingWakeStrength(speed: number) {
  const magnitude = Math.abs(speed)
  return magnitude <= minimumSpeed ? 0 : Math.min(1, magnitude / wakeSpeed)
}

export function wakeStrength(skiff: Skiff, rendered: Pose = skiff) {
  const strength = movingWakeStrength(skiff.speed)
  if (!strength || waterDepth(skiff) <= 0 || waterDepth(rendered) <= 0) return 0
  const source = offset(rendered, 0, skiff.speed < 0 ? 2.25 : -2.1)
  return waterDepth(source) > 0 ? strength : 0
}

export function skiffStudyPose(origin: Point, time = 0, response = 0): Skiff {
  const phase = (time % replayDuration) / replayDuration
  const angle = phase * Math.PI * 2
  const travel = phase - Math.sin(angle) / (Math.PI * 2)
  return {
    x: origin.x + 4.8 - travel * response * wakeSpeed * replayDuration / 2,
    z: origin.z - 0.65,
    heading: -Math.PI / 2,
    speed: response * wakeSpeed * (1 - Math.cos(angle)) / 2,
  }
}
