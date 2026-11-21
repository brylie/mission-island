import { waterLevel } from './terrain.ts'
import { daySeconds } from './weather.ts'

export const shellglassCycle = daySeconds * 2.55
export const shellglassLow = waterLevel + 0.007
export const shellglassHigh = waterLevel + 0.22

export const shellglassWash = { rx: 3.02, rz: 2.07, cos: 0.89, sin: 0.45 }

export const shellglassPockets = [
  { x: 47.74, z: -32.89, rx: 0.40, rz: 0.33, level: 0.045 },
  { x: 46.66, z: -31.82, rx: 0.40, rz: 0.30, level: 0.030 },
  { x: 44.63, z: -33.53, rx: 0.38, rz: 0.29, level: 0.055 },
] as const

const surface = (fraction: number) => shellglassLow + (shellglassHigh - shellglassLow) * (0.5 - 0.5 * Math.cos(fraction * Math.PI * 2))

export function shellglassTideAt(islandTime: number) {
  const time = Math.max(0, islandTime)
  const fraction = time % shellglassCycle / shellglassCycle
  const level = surface(fraction)
  const wetRim = Math.max(level, surface(fraction - 0.14) - 0.008)
  const phase = fraction < 0.085 || fraction > 0.915
    ? 'Low water'
    : fraction < 0.43
      ? 'Rising'
      : fraction <= 0.57
        ? 'High water'
        : 'Retreating'
  return { time, fraction, level, wetRim, phase } as const
}
