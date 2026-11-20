import { waterLevel } from './terrain.ts'
import { daySeconds } from './weather.ts'

export const shellglassCycle = daySeconds * 2.55
export const shellglassLow = waterLevel + .007
export const shellglassHigh = waterLevel + .22

export const shellglassWash = { rx: 3.02, rz: 2.07, cos: .89, sin: .45 }

export const shellglassPockets = [
  { x: 47.74, z: -32.89, rx: .40, rz: .33, level: .045 },
  { x: 46.66, z: -31.82, rx: .40, rz: .30, level: .030 },
  { x: 44.63, z: -33.53, rx: .38, rz: .29, level: .055 },
] as const

const surface = (fraction: number) => shellglassLow + (shellglassHigh - shellglassLow) * (.5 - .5 * Math.cos(fraction * Math.PI * 2))

export function shellglassTideAt(islandTime: number) {
  const time = Math.max(0, islandTime)
  const fraction = time % shellglassCycle / shellglassCycle
  const level = surface(fraction)
  const wetRim = Math.max(level, surface(fraction - .14) - .008)
  const phase = fraction < .085 || fraction > .915 ? 'Low water'
    : fraction < .43 ? 'Rising'
    : fraction <= .57 ? 'High water'
    : 'Retreating'
  return { time, fraction, level, wetRim, phase } as const
}
