import { advanceSchool, createSchool, schoolStep } from '../simulation/fish-school.ts'
import type { Point } from '../world.ts'

export const trialSeconds = 30
const lastTick = Math.round(trialSeconds / schoolStep)
const routeLimit = 96
type Waypoint = [tick: number, eastDm: number, northDm: number]
type Disturbance = 'player' | 'skiff'

export function readSchoolRoute(raw: unknown): Waypoint[] {
  if (typeof raw !== 'string' || raw.length > 1800) return []
  try {
    const points: unknown = JSON.parse(raw)
    if (!Array.isArray(points) || points.length > routeLimit) return []
    let before = -1
    for (const point of points) {
      if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isInteger)) return []
      const [tick, x, z] = point as Waypoint
      if (tick <= before || tick > lastTick || Math.hypot(x, z) > 61) return []
      before = tick
    }
    return points as Waypoint[]
  } catch { return [] }
}

export function createSchoolTrial(seed: number, kind: Disturbance, raw: unknown, nudge = false) {
  const route = readSchoolRoute(raw)
  const school = createSchool(seed, nudge)
  const actor = { x: -6, z: 0, heading: Math.PI / 2, speed: 0 }
  const tracks: Point[][] = school.fish.map(() => [])
  let tick = 0, nextCommand = 0
  let target: Point = actor
  function restart() {
    Object.assign(school, createSchool(seed, nudge))
    Object.assign(actor, { x: -6, z: 0, heading: Math.PI / 2, speed: 0 })
    target = actor
    for (const track of tracks) track.length = 0
    tick = nextCommand = 0
  }
  function seek(seconds: number) {
    const end = Math.min(lastTick, Math.max(0, Math.floor(seconds / schoolStep)))
    if (end < tick) restart()
    while (tick < end) {
      // Default crossing is replaced from the first recorded input onward.
      if (!nextCommand && tick === 45) target = { x: 6, z: 0 }
      const command = route[nextCommand]
      if (command?.[0] === tick) {
        target = { x: command[1] / 10, z: command[2] / 10 }
        nextCommand++
      }
      const dx = target.x - actor.x, dz = target.z - actor.z, distance = Math.hypot(dx, dz)
      actor.speed = Math.min(kind === 'skiff' ? 2.7 : 1.8, distance / schoolStep)
      if (distance > .001) {
        actor.heading = Math.atan2(dx, dz)
        actor.x += dx / distance * actor.speed * schoolStep
        actor.z += dz / distance * actor.speed * schoolStep
      }
      advanceSchool(school, [{ ...actor, range: kind === 'skiff' ? 2.9 : 1.9 }])
      tick++
      if (tick % 4 === 0) {
        for (const [i, fish] of school.fish.entries()) {
          const track = tracks[i]
          track.push({ x: fish.x, z: fish.z })
          if (track.length > 10) track.shift()
        }
      }
    }
  }
  function steer(point: Point) {
    const clipped = Math.min(1, 6 / Math.max(.01, Math.hypot(point.x, point.z)))
    const keep = route.findIndex(([at]) => at >= tick)
    if (keep < 0 && route.length === routeLimit) return false
    if (keep >= 0) route.length = keep
    nextCommand = route.length
    route.push([tick, Math.round(point.x * clipped * 10), Math.round(point.z * clipped * 10)])
    return true
  }
  return { school, actor, seek, steer, route, tracks }
}
