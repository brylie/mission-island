import { laneMarkingModel } from './assets/geometry/route-profiles.ts'
import { depotLaneStart, harborRoadLayout, seabrookWalkLayout, starterTrailLayout } from './worlds/starter/layout/routes.ts'
import { beach, distance, ferryTerminal, harbor, lookout } from './world.ts'
import { meadowFoot, meadowHill } from './terrain.ts'
import type { Point } from './world.ts'

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
}

const maxCornerInsetRatio = 0.45
const cornerSegments = 12

function roundCorners(points: readonly Point[], trim: number): Point[] {
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
export const roads = [harborRoad, depotLane]

export function distanceToRoads(point: Point) {
  return Math.min(...roads.map((path) => distanceToRoute(point, path)))
}

export { shellglassPoint, splitstone } from './worlds/starter/layout/routes.ts'

export type PathSurface = 'gravel' | 'pavement' | 'desire'
interface Footpath { name: string, width: number, surface: PathSurface, points: Point[] }

function footpath({ name, surface, width, trim }: Omit<Footpath, 'points'> & { trim: number }, points: readonly Point[]): Footpath {
  return { name, surface, width, points: roundCorners(points, trim) }
}

const { meadow, beach: shore, juniper, lookout: hill, harbor: depot, splitstone, driftwood } = starterTrailLayout
export const meadowPath = footpath(meadow, [meadow.start, meadowFoot, meadow.rise, meadowHill])
export const beachTrail = footpath(shore, [...shore.approach, beach])
export const juniperTrail = footpath(juniper, juniper.points)

export const footpaths: Footpath[] = [
  footpath(hill, [...hill.approach, lookout]),
  beachTrail,
  footpath(depot, [depot.start, harbor, depot.end]),
  footpath(splitstone, splitstone.points),
  footpath(driftwood, driftwood.points),
  meadowPath,
  juniperTrail,
]

export function distanceToRoute(point: Point, path: readonly Point[]) {
  let nearest = Infinity
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]
    const b = path[i]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const fraction = ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)
    nearest = Math.min(nearest, distance(point, lerp(a, b, Math.max(0, Math.min(1, fraction)))))
  }
  return nearest
}

export function laneMarkings(path: readonly Point[]) {
  const lengths = [0]
  for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1] + distance(path[i - 1], path[i]))

  const pointAt = (along: number) => {
    const i = lengths.findIndex((length) => length >= along)
    return lerp(path[i - 1], path[i], (along - lengths[i - 1]) / (lengths[i] - lengths[i - 1]))
  }

  const markings: Point[][] = []
  const { lead, endClearance, spacing, length } = laneMarkingModel.dashes
  for (let start = lead; start + endClearance < lengths[lengths.length - 1]; start += spacing) {
    const end = start + length
    markings.push([
      pointAt(start),
      ...path.filter((_, i) => lengths[i] > start && lengths[i] < end),
      pointAt(end),
    ])
  }
  return markings
}

const { fixed, northHouses } = seabrookWalkLayout
export const walkways = [
  ...fixed,
  ...northHouses.doors.map(({ x, z }) => ({
    name: 'Seabrook front walk ' + x,
    width: northHouses.width,
    points: [{ x, z: northHouses.firstZ }, { x, z }],
  })),
]
