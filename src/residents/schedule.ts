import type { Player } from '../protocol.ts'
import { walkingHeight } from '../terrain.ts'
import { dawnHour, daySeconds, hoursPerDay, weatherAt } from '../weather.ts'
import { distance, offset } from '../world.ts'
import type { Leg, ResidentDefinition, ResidentWorld, ScheduleTrait } from './definition.ts'

const defaultConversationReachM = 2.4
const half = 0.5
const minutesPerHour = 60
const clockDigits = 2
const doorThresholdClearanceM = 0.38

export function secondsAtIslandHour(hour: number) {
  return ((hour - dawnHour + hoursPerDay) % hoursPerDay) * daySeconds / hoursPerDay
}

function along(route: readonly Leg[], metres: number) {
  let left = metres
  for (let i = 1; i < route.length; i++) {
    const [start, end] = [route[i - 1].point, route[i].point]
    const length = distance(start, end)
    if (left < length) {
      const fraction = left / length
      return { x: start.x + (end.x - start.x) * fraction, z: start.z + (end.z - start.z) * fraction, heading: Math.atan2(end.x - start.x, end.z - start.z), indoors: route[i].indoors === true, done: false }
    }
    left -= length
  }
  const last = route[route.length - 1].point
  return { ...last, heading: 0, indoors: false, done: true }
}

function entranceOf({ household: { building, rearEntrance } }: ScheduleTrait) {
  return offset({ ...building, heading: building.heading ?? 0 }, 0, (building.d * half + doorThresholdClearanceM) * (rearEntrance ? 1 : -1))
}

function walking(spot: ReturnType<typeof along>) {
  return { x: spot.x, z: spot.z, heading: spot.heading, walking: true, indoors: spot.indoors, stop: 'walking' as const, windowLit: false }
}

// The porch stays available after work. The front or rear door is the start of the morning walk
// and, after porch time, the end of the evening walk. Indoor activity follows the same clock.
export function residentAt(schedule: ScheduleTrait, state: ResidentWorld) {
  const { home, work, household, departs, returns, pace } = schedule
  const { hour } = weatherAt(state.islandTime)
  const door = entranceOf(schedule)
  const stepsOut = household.stepsOut ?? departs
  const atHome = { x: home.x, z: home.z, heading: home.heading, walking: false, indoors: false, stop: 'home' as const, windowLit: false }
  const inside = { ...door, heading: home.heading, walking: false, indoors: true, stop: 'home' as const, windowLit: hour >= household.wakes && hour < household.bedtime }
  if (hour < stepsOut) return inside
  if (hour < departs) {
    const step = along([{ point: door }, { point: home }], (hour - stepsOut) * pace)
    return step.done ? atHome : walking(step)
  }
  if (hour < returns) {
    const route = schedule.route(state)
    const spot = along(household.stepsOut === undefined ? [{ point: door }, ...route] : route, (hour - departs) * pace)
    return spot.done ? { x: work.x, z: work.z, heading: work.heading, walking: false, indoors: false, stop: 'work' as const, windowLit: false } : walking(spot)
  }

  // Walking home, each leg's indoor flag moves to the leg that now ends at that doorway.
  const path = [...schedule.route(state)].reverse().map((leg, i, legs) => ({ point: leg.point, indoors: legs[i - 1]?.indoors }))
  const walked = (hour - returns) * pace
  const spot = along(path, walked)
  if (!spot.done) return walking(spot)
  if (hour < household.goesIn) return atHome
  const step = along([{ point: home }, { point: door }], (hour - household.goesIn) * pace)
  return step.done ? inside : walking(step)
}

function clockLabel(hour: number) {
  const minutes = Math.round(hour * minutesPerHour)
  const digits = (part: number) => String(part).padStart(clockDigits, '0')
  return `${digits(Math.floor(minutes / minutesPerHour) % hoursPerDay)}:${digits(minutes % minutesPerHour)}`
}

export function residentVisitingHours({ work, home, departs, returns, household }: ScheduleTrait) {
  const morning = household.stepsOut === undefined ? '' : `Steps outside at ${clockLabel(household.stepsOut)}. `
  return `${morning}Leaves for ${work.name} at ${clockLabel(departs)}. Heads home at ${clockLabel(returns)} and stays outside the ${home.name} until ${clockLabel(household.goesIn)}.`
}

export function residentAwayMessage({ identity, schedule }: ResidentDefinition) {
  const { departs, work, home, household: { stepsOut } } = schedule
  const next = stepsOut === undefined
    ? `Look for them on the way to ${work.name} from ${clockLabel(departs)} in the morning.`
    : `Look for them outside the ${home.name} from ${clockLabel(stepsOut)} in the morning.`
  return `${identity.name} is inside. ${next}`
}

export function standing(player: Player) {
  return player.grounded && !player.seat && !player.onBed && !player.swimming && !player.sleeping && !player.truckSurface
}

// Close enough to talk: standing, within reach on the same level, and the resident is outdoors.
export function atResident(resident: ResidentDefinition, state: ResidentWorld, player: Player) {
  const spot = residentAt(resident.schedule, state)
  return standing(player) && !spot.indoors && distance(player, spot) < (resident.reach ?? defaultConversationReachM)
    && Math.abs(player.y - walkingHeight(spot)) < 1
}
