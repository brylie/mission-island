import type { Weather } from './protocol.ts'
import { groundHeight } from './terrain.ts'
import { smoothRange } from './wildlife-motion.ts'
import { liftStrength, type LiftSite } from './worlds/starter/lift.ts'

// Gulls ride rising air with their wings held still, circling to stay in the lift and drifting
// wider as they glide down to find it again. A gull circling over a hill or a sunny field tells a
// pilot where to climb. Weak thermals hold fewer gulls and lower ceilings. Gulls shelter at the
// harbor in heavy rain and roost before dusk, as the dock gulls do.
export const gullsPerLift = 2
const lowest = 5
const airspeed = 5.2

// The weakest lift each gull will ride, so a fading thermal thins out one bird at a time.
const shares = [.3, .6] as const

function thermalGullCycle(site: number, index: number) {
  return { period: 64 + (site * 7 + index * 11) % 17, offset: site * 13.7 + index * 29.3 }
}

const away = (sky: Weather) => sky.rain >= .65 || sky.hour < 7 || sky.hour >= 17.5

// Where a gull riding a lift site is at a given time, or null when it is away. A gull decides
// whether to join at the top of each climb, so it never appears or leaves low and close.
export function thermalGullAt(time: number, siteIndex: number, site: LiftSite, index: number,
  weather: Weather, weatherAt?: (time: number) => Weather) {
  const { period, offset } = thermalGullCycle(siteIndex, index)
  const start = Math.floor((time + offset) / period) * period - offset
  const sky = weatherAt?.(start) ?? weather
  if (away(sky) || liftStrength(site, sky.hour, sky.rain) < shares[index]) return null
  const strength = Math.min(1, liftStrength(site, weather.hour, weather.rain))
  const top = lowest + (site.ceiling - 4 - lowest) * Math.max(.35, strength)
  const age = (time - start) / period
  const climb = Math.sin(2 * Math.PI * age)
  // The cycle starts at the top: glide down and wide, then climb tight in the core.
  const height = lowest + (top - lowest) * (.5 + .5 * Math.cos(2 * Math.PI * age))
  const radius = site.radius * (.55 + .08 * index) * (1 + .3 * climb)
  // Every gull in one column turns the same way, as soaring birds sharing a thermal tend to.
  const turn = siteIndex % 2 ? 1 : -1
  const angle = turn * airspeed * time / (site.radius * (.55 + .08 * index)) + index * Math.PI + siteIndex
  const x = site.x + radius * Math.cos(angle), z = site.z + radius * Math.sin(angle)
  const heading = Math.atan2(-turn * Math.sin(angle), turn * Math.cos(angle))
  const rise = -(top - lowest) * Math.PI * Math.sin(2 * Math.PI * age) / period
  // A few wingbeats now and then to tidy a turn. Soaring gulls rarely flap.
  const beat = smoothRange(.93, .97, (age * 3 + index * .37) % 1) * (1 - smoothRange(.97, 1, (age * 3 + index * .37) % 1))
  return {
    x, y: groundHeight(site) + height, z, heading, phase: 'Glide' as const, grounded: false, fold: 0,
    flap: Math.sin(time * 11.2) * .45 * beat, bank: .26 * turn * (1 - .3 * Math.max(0, -climb)),
    pitch: Math.max(-.2, Math.min(.15, -Math.atan2(rise, airspeed))), tuck: 1, crouch: 0, sweep: .13,
  }
}
