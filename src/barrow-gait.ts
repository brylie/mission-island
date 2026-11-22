import { smoothstep } from './math/smoothstep.ts'

const loadedSpeed = 1.6
const emptySpeed = 1.85
const cycleMetres = 1.3
export const barrowWalk = { loadedSpeed, emptySpeed, cycleMetres }

const stance = 0.52
const shoeReach = 0.66
const legsPerCycle = 2
const normalizedStrokeRange = 2
const kneeLift = 0.64
const kneeLiftPower = 2
const kneeHipCounterPitch = 0.52
const halfStroke = barrowWalk.cycleMetres * stance / normalizedStrokeRange

export function barrowLegPose(cycle: number, leg: number, strength: number) {
  const phase = (cycle + leg / legsPerCycle) % 1
  const swing = Math.max(0, (phase - stance) / (1 - stance))
  const eased = smoothstep(swing)
  const shoeZ = halfStroke * (phase < stance ? 1 - normalizedStrokeRange * phase / stance : normalizedStrokeRange * eased - 1)
  const knee = kneeLift * strength * Math.sin(Math.PI * swing) ** kneeLiftPower
  return { hip: -Math.asin(shoeZ * strength / shoeReach) - kneeHipCounterPitch * knee, knee }
}
