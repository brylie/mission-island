import { advanceSchool, createSchool, schoolStep } from '../simulation/fish-school.ts'
import type { Point } from '../world.ts'

export const trialSeconds = 30
const lastTick = Math.round(trialSeconds / schoolStep)
const routeLimit = 96
const routeCharacterLimit = 1800
const waypointFields = 3
const routeRadiusDm = 61
const crossingHalfWidth = 6
const firstCrossingTick = 45
const returnCrossingTick = 360
const decimetresPerMetre = 10
const directionDeadZone = 0.001
const minimumRouteDistance = 0.01
const skiffSpeed = 2.7
const walkerSpeed = 1.8
const skiffAlarmRadius = 2.9
const walkerAlarmRadius = 1.9
const trailSampleTicks = 4
const halves = 2
export const schoolTrailSamples = 10
type Waypoint = [tick: number, eastDm: number, northDm: number]
type Disturbance = 'player' | 'skiff'
interface Crossing {
  side?: 'east' | 'west'
  returnPass?: boolean
}

export function readSchoolRoute(raw: unknown): Waypoint[] {
  if (typeof raw !== 'string' || raw.length > routeCharacterLimit) return []
  try {
    const points: unknown = JSON.parse(raw)
    if (!Array.isArray(points) || points.length > routeLimit) return []
    let before = -1
    for (const point of points) {
      if (!Array.isArray(point) || point.length !== waypointFields || !point.every(Number.isInteger)) return []
      const [tick, x, z] = point as Waypoint
      if (tick <= before || tick > lastTick || Math.hypot(x, z) > routeRadiusDm) return []
      before = tick
    }
    return points as Waypoint[]
  }
  catch { return [] }
}

export function createSchoolTrial(seed: number, kind: Disturbance, raw: unknown, nudge = false, crossing: Crossing = {}) {
  const route = readSchoolRoute(raw)
  const school = createSchool(seed, nudge)
  const start = crossing.side === 'east' ? crossingHalfWidth : -crossingHalfWidth
  const entry = { x: start, z: 0, heading: -Math.sign(start) * Math.PI / halves, speed: 0 }
  const actor = { ...entry }
  const tracks: Point[][] = school.fish.map(() => [])
  let tick = 0, nextCommand = 0
  let target: Point = actor
  function restart() {
    Object.assign(school, createSchool(seed, nudge))
    Object.assign(actor, entry)
    target = actor
    for (const track of tracks) track.length = 0
    tick = nextCommand = 0
  }
  function seek(seconds: number) {
    const end = Math.min(lastTick, Math.max(0, Math.floor(seconds / schoolStep)))
    if (end < tick) restart()
    while (tick < end) {
      // Default crossing is replaced from the first recorded input onward.
      if (!nextCommand && tick === firstCrossingTick) target = { x: -start, z: 0 }
      if (!nextCommand && crossing.returnPass && tick === returnCrossingTick) target = entry
      const command = route[nextCommand]
      if (command?.[0] === tick) {
        target = { x: command[1] / decimetresPerMetre, z: command[2] / decimetresPerMetre }
        nextCommand++
      }
      const dx = target.x - actor.x, dz = target.z - actor.z, distance = Math.hypot(dx, dz)
      actor.speed = Math.min(kind === 'skiff' ? skiffSpeed : walkerSpeed, distance / schoolStep)
      if (distance > directionDeadZone) {
        actor.heading = Math.atan2(dx, dz)
        actor.x += dx / distance * actor.speed * schoolStep
        actor.z += dz / distance * actor.speed * schoolStep
      }
      advanceSchool(school, [{ ...actor, range: kind === 'skiff' ? skiffAlarmRadius : walkerAlarmRadius }])
      tick++
      if (tick % trailSampleTicks === 0) {
        for (const [i, fish] of school.fish.entries()) {
          const track = tracks[i]
          track.push({ x: fish.x, z: fish.z })
          if (track.length > schoolTrailSamples) track.shift()
        }
      }
    }
  }
  function steer(point: Point) {
    const clipped = Math.min(1, crossingHalfWidth / Math.max(minimumRouteDistance, Math.hypot(point.x, point.z)))
    const keep = route.findIndex(([at]) => at >= tick)
    if (keep < 0 && route.length === routeLimit) return false
    if (keep >= 0) route.length = keep
    nextCommand = route.length
    route.push([tick, Math.round(point.x * clipped * decimetresPerMetre), Math.round(point.z * clipped * decimetresPerMetre)])
    return true
  }
  return { school, actor, seek, steer, route, tracks }
}
