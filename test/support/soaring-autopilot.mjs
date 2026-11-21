import { startRidgeFlight, stepRidgeFlight } from '../../src/simulation/ridge-flight.ts'
import { groundHeight } from '../../src/terrain.ts'
import { liftSites } from '../../src/worlds/starter/lift.ts'

const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle))
const clamp = value => Math.max(-1, Math.min(1, value))
const site = id => liftSites.find(lift => lift.id === id)

// A patient pilot: fly to each lift site, circle in it with the nose up until near its
// ceiling, then glide on to the target. Returns the flight and when the target was overflown.
export function soar(route, target, { conditions, spotHeight = 4, spotRange = 12, maxSeconds = 240 } = {}) {
  const flight = startRidgeFlight()
  const legs = [...route.map(site), null]
  let leg = 0, circling = false, best = 0, stalled = 0, spottedAt
  for (let tick = 0; tick < maxSeconds * 30 && !flight.outcome; tick++) {
    const { pilot } = flight
    const lift = legs[leg]
    const aim = lift ?? target
    const dx = aim.x - pilot.x, dz = aim.z - pilot.z, range = Math.hypot(dx, dz)
    let turn, pitch
    if (lift && (circling || range < lift.radius * .7)) {
      circling = true
      // Orbit the centre about 5 m out, nose up for a slow, tight turn.
      const bearing = Math.atan2(dx, dz)
      turn = clamp(2 * wrap(bearing - Math.PI / 2 + .25 * (range - 5) - pilot.heading))
      pitch = -1
      const height = pilot.y - groundHeight(lift)
      if (height > best + .05) { best = height; stalled = 0 } else stalled++
      if (height > lift.ceiling - 4 || stalled > 30 * 6) { leg++; circling = false; best = 0; stalled = 0 }
    } else {
      turn = clamp(2 * wrap(Math.atan2(dx, dz) - pilot.heading))
      pitch = -.6
    }
    stepRidgeFlight(flight, { turn, pitch }, conditions)
    if (!lift && spottedAt === undefined && Math.hypot(target.x - pilot.x, target.z - pilot.z) <= spotRange &&
      pilot.y - groundHeight(pilot) >= spotHeight) spottedAt = flight.elapsed
  }
  return { flight, spottedAt }
}
