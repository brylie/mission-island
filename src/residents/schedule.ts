import type { Player } from '../protocol.ts'
import { walkingHeight } from '../terrain.ts'
import { weatherAt } from '../weather.ts'
import { distance } from '../world.ts'
import type { Leg, ResidentDefinition, ResidentWorld, ScheduleTrait } from './definition.ts'

function along(route: readonly Leg[], metres: number) {
  let left = metres
  for (let i = 1; i < route.length; i++) {
    const [start, end] = [route[i - 1].point, route[i].point]
    const length = distance(start, end)
    if (left <= length) {
      const fraction = length ? left / length : 1
      return { x: start.x + (end.x - start.x) * fraction, z: start.z + (end.z - start.z) * fraction, heading: Math.atan2(end.x - start.x, end.z - start.z), indoors: route[i].indoors === true, done: false }
    }
    left -= length
  }
  const last = route[route.length - 1].point
  return { ...last, heading: 0, indoors: false, done: true }
}

// Where a resident is on the shared clock: at home before setting out and after getting back,
// at work in between, and walking the route either way. Every client and the host agree.
export function residentAt(schedule: ScheduleTrait, state: ResidentWorld) {
  const { home, work, departs, returns, pace } = schedule
  const { hour } = weatherAt(state.islandTime)
  const atHome = { x: home.x, z: home.z, heading: home.heading, walking: false, indoors: false, stop: 'home' as const }
  if (hour < departs) return atHome
  const route = schedule.route(state)
  const returning = hour >= returns
  const walked = (hour - (returning ? returns : departs)) * pace
  // Walking home, each leg's indoor flag moves to the leg that now ends at that doorway.
  const path = returning ? [...route].reverse().map((leg, i, legs) => ({ point: leg.point, indoors: legs[i - 1]?.indoors })) : route
  const spot = along(path, walked)
  if (spot.done) return returning ? atHome : { x: work.x, z: work.z, heading: work.heading, walking: false, indoors: false, stop: 'work' as const }
  return { x: spot.x, z: spot.z, heading: spot.heading, walking: true, indoors: spot.indoors, stop: 'walking' as const }
}

export function standing(player: Player) {
  return player.grounded && !player.seat && !player.onBed && !player.swimming && !player.sleeping && !player.truckSurface
}

// Close enough to talk: standing, within reach on the same level, and the resident is outdoors.
export function atResident(resident: ResidentDefinition, state: ResidentWorld, player: Player) {
  const spot = residentAt(resident.schedule, state)
  return standing(player) && !spot.indoors && distance(player, spot) < (resident.reach ?? 2.4)
    && Math.abs(player.y - walkingHeight(spot)) < 1
}
