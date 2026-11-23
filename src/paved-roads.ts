import { depotLaneStart, harborRoadLayout } from './worlds/starter/layout/routes.ts'
import { distance, ferryTerminal, type Point } from './world.ts'

// The village's paved roads: Harbor Depot road and the depot lane. They live apart from
// the footpaths so the road network (and through it the ground) can read them without
// reaching the terrain module, which the footpaths need.

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
}

const maxCornerInsetRatio = 0.45
const cornerSegments = 12

export function roundCorners(points: readonly Point[], trim: number): Point[] {
  const path = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const before = points[i - 1], corner = points[i], after = points[i + 1]
    const incoming = distance(corner, before)
    const outgoing = distance(corner, after)
    const inset = Math.min(trim, incoming * maxCornerInsetRatio, outgoing * maxCornerInsetRatio)
    const start = lerp(corner, before, inset / incoming)
    const end = lerp(corner, after, inset / outgoing)
    for (let step = 0; step <= cornerSegments; step++) {
      const t = step / cornerSegments
      path.push(lerp(lerp(start, corner, t), lerp(corner, end, t), t))
    }
  }
  path.push(points[points.length - 1])
  return path
}

// Harbor Depot road runs from the ferry ramp, straight north past the freight yard, then curves away to Seabrook.
// Its points run from the ramp end so the ramp lane stays one straight segment on the terminal's centreline.
export const harborRoad = roundCorners([
  { x: ferryTerminal.x, z: ferryTerminal.z },
  { x: ferryTerminal.x, z: harborRoadLayout.rampStemZ },
  ...harborRoadLayout.inland,
], harborRoadLayout.trim)

function crossingAt(path: readonly Point[], z: number): Point {
  const i = path.findIndex((point) => point.z >= z)
  const a = path[i - 1], b = path[i]
  return lerp(a, b, (z - a.z) / (b.z - a.z))
}

// The depot lane leaves Harbor Depot road at the fork and runs west past the depot to the cottages.
export const depotJunction = crossingAt(harborRoad, depotLaneStart.z)
export const depotLane: Point[] = [depotLaneStart, depotJunction]
