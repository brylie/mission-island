import { waterDepth } from '../terrain.ts'
import { offset, onDock } from '../world.ts'
import type { Pose } from '../world.ts'

const minimumCastMetres = 3.1
const castRangeSpanMetres = 9.2
const requiredFishingDepthM = 0.14
const minimumBiteChance = 0.22
const chargedBiteChanceGain = 0.76
const pullCycleSeconds = 3.1
const calmPhaseSeconds = 1.7
const pullingReelTensionPerSecond = 0.85
const calmReelTensionPerSecond = 0.2
const releasedTensionPerSecond = -0.66
const calmReelProgressPerSecond = 0.22
const pullingProgressPerSecond = -0.052
const slackProgressPerSecond = -0.023
const fightLimitSeconds = 23
export const initialFishingTension = 0.25

export function castPoint(pose: Pose, power: number) {
  const point = offset(pose, 0, minimumCastMetres + castRangeSpanMetres * power)
  return !onDock(point) && waterDepth(point) >= requiredFishingDepthM ? point : undefined
}

export function catchChance(power: number) {
  return minimumBiteChance + chargedBiteChanceGain * power * power
}

export const fishIsPulling = (elapsed: number) => elapsed % pullCycleSeconds > calmPhaseSeconds

export function stepFight(fight: { progress: number, tension: number, pulling: boolean }, elapsed: number, reeling: boolean, dt: number) {
  fight.pulling = fishIsPulling(elapsed)
  const tensionRate = reeling ? (fight.pulling ? pullingReelTensionPerSecond : calmReelTensionPerSecond) : releasedTensionPerSecond
  fight.tension = Math.max(0, Math.min(1, fight.tension + tensionRate * dt))
  fight.progress = Math.max(0, Math.min(1, fight.progress
  + (reeling && !fight.pulling ? calmReelProgressPerSecond : fight.pulling ? pullingProgressPerSecond : slackProgressPerSecond) * dt))
  if (fight.tension >= 1) return 'line-snapped'
  if (fight.progress >= 1) return 'caught'
  if (elapsed >= fightLimitSeconds) return 'escaped'
}
