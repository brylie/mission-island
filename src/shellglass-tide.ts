import { shellglassWaterShapes } from './assets/geometry/shellglass.ts'
import { waterLevel } from './terrain.ts'
import { daySeconds } from './weather.ts'
import { shellglassBasin } from './worlds/starter/layout/terrain.ts'

export { shellglassPocketSites as shellglassPockets } from './worlds/starter/layout/terrain.ts'

const tideCycleDays = 2.55
const lowWaterRise = 0.007
const highWaterRise = 0.22
const wetRimLag = 0.14
const wetRimDrop = 0.008
const lowWaterEnd = 0.085
const lowWaterStart = 0.915
const highWaterStart = 0.43
const highWaterEnd = 0.57
const half = 0.5
const piRadiansPerTurn = 2

export const shellglassCycle = daySeconds * tideCycleDays
export const shellglassLow = waterLevel + lowWaterRise
export const shellglassHigh = waterLevel + highWaterRise

export const shellglassWash = { ...shellglassWaterShapes.wash, cos: shellglassBasin.bearing.forward, sin: shellglassBasin.bearing.lateral }

const surface = (fraction: number) => shellglassLow + (shellglassHigh - shellglassLow) * (half - half * Math.cos(fraction * Math.PI * piRadiansPerTurn))

export function shellglassTideAt(islandTime: number) {
  const time = Math.max(0, islandTime)
  const fraction = time % shellglassCycle / shellglassCycle
  const level = surface(fraction)
  const wetRim = Math.max(level, surface(fraction - wetRimLag) - wetRimDrop)
  const phase = fraction < lowWaterEnd || fraction > lowWaterStart
    ? 'Low water'
    : fraction < highWaterStart
      ? 'Rising'
      : fraction <= highWaterEnd
        ? 'High water'
        : 'Retreating'
  return { time, fraction, level, wetRim, phase } as const
}
