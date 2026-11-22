import { coastBounds, groundHeight, waterLevel } from './terrain.ts'
import type { Point } from './world.ts'
import { traceShoreline } from './worlds/starter/generation/shoreline.ts'

// The island's real shoreline as ordered loops, traced once from the ground
// itself, so coves, straits and islets all follow the terrain. Surf and the map
// use it; `coastPoint` stays a radius per bearing for bounds and buoys.
const traceStepM = 2
const spacingM = 4
const minimumLoopM = 24
const marginM = 10
const boundsRadius = 1.05

interface ShoreLoop {
  points: readonly Point[]
  // Metres along the loop at each point, from its first point.
  along: readonly number[]
  length: number
}

let loops: ShoreLoop[] | undefined

export function shorelineLoops(): readonly ShoreLoop[] {
  if (loops) return loops
  const b = coastBounds(boundsRadius)
  const traced = traceShoreline(groundHeight, waterLevel, { west: b.west - marginM, east: b.east + marginM, south: b.south - marginM, north: b.north + marginM }, traceStepM, spacingM, minimumLoopM)
  loops = traced.map((points) => {
    const along = [0]
    for (let i = 1; i < points.length; i++) along.push(along[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z))
    const last = points[points.length - 1], first = points[0]
    return { points, along, length: along[along.length - 1] + Math.hypot(first.x - last.x, first.z - last.z) }
  })
  return loops
}

// The point a distance along a loop, wrapping around it.
export function pointAlong(loop: ShoreLoop, metres: number): Point {
  const s = ((metres % loop.length) + loop.length) % loop.length
  let lo = 0, hi = loop.along.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (loop.along[mid] <= s) lo = mid
    else hi = mid - 1
  }
  const a = loop.points[lo], b = loop.points[(lo + 1) % loop.points.length]
  const end = lo + 1 < loop.along.length ? loop.along[lo + 1] : loop.length
  const t = (s - loop.along[lo]) / Math.max(end - loop.along[lo], Number.EPSILON)
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
}

// The nearest shoreline point to a listener: which loop, how far along it, how far away.
export function nearestShore(point: Point) {
  let best = { loop: 0, along: 0, distance: Infinity }
  for (const [index, loop] of shorelineLoops().entries()) {
    for (const [i, p] of loop.points.entries()) {
      const d = Math.hypot(p.x - point.x, p.z - point.z)
      if (d < best.distance) best = { loop: index, along: loop.along[i], distance: d }
    }
  }
  return best
}
