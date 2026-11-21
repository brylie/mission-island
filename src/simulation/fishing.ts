import { waterDepth } from '../terrain.ts'
import { offset, onDock } from '../world.ts'
import type { Pose } from '../world.ts'

export function castPoint(pose: Pose, power: number) {
  const point = offset(pose, 0, 3.1 + 9.2 * power)
  return !onDock(point) && waterDepth(point) >= 0.14 ? point : undefined
}

export function catchChance(power: number) {
  return 0.22 + 0.76 * power * power
}

export function stepFight(fight: { progress: number, tension: number, pulling: boolean }, elapsed: number, reeling: boolean, dt: number) {
  fight.pulling = elapsed % 3.1 > 1.7
  const tensionRate = reeling ? (fight.pulling ? 0.85 : 0.20) : -0.66
  fight.tension = Math.max(0, Math.min(1, fight.tension + tensionRate * dt))
  fight.progress = Math.max(0, Math.min(1, fight.progress
  + (reeling && !fight.pulling ? 0.22 : fight.pulling ? -0.052 : -0.023) * dt))
  if (fight.tension >= 1) return 'line-snapped'
  if (fight.progress >= 1) return 'caught'
  if (elapsed >= 23) return 'escaped'
}
