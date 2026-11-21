import { exponentialBlend, smoothRange } from './motion-easing.ts'

export interface GaitTiming {
  metresPerCycle(speed: number): number
  speedResponse: number
  fullStrideSpeed: number
}

interface GaitState {
  readonly cycle: number
  readonly speed: number
}

export const restingGait: GaitState = { cycle: 0, speed: 0 }

// Navigation supplies the achieved horizontal travel after turns and obstacles.
// The rig owns what each limb does at a given phase.
export function advanceGait(timing: GaitTiming, previous: GaitState, travelled: number, seconds: number) {
  if (seconds <= 0) return { ...previous, advance: 0 }
  const measured = travelled / Math.max(.001, seconds)
  const speed = previous.speed + (measured - previous.speed) * exponentialBlend(timing.speedResponse, seconds)
  const advance = travelled / timing.metresPerCycle(speed)
  return { cycle: previous.cycle + advance, speed, advance }
}

export function gaitAmount(timing: GaitTiming, speed: number) {
  return smoothRange(0, timing.fullStrideSpeed, speed)
}

export function gaitPhase(cycle: number, offset = 0) {
  const limb = cycle + offset
  return limb - Math.floor(limb)
}
