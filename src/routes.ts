import { laneMarkingModel } from './assets/geometry/route-profiles.ts'
import { seabrookWalkLayout, starterTrailLayout } from './worlds/starter/layout/routes.ts'
import { beach, distance, harbor, lookout } from './world.ts'
import { meadowFoot, meadowHill } from './terrain.ts'
import type { Point } from './world.ts'

import { depotJunction, depotLane, harborRoad, lerp, roundCorners } from './paved-roads.ts'

export { depotJunction, depotLane, harborRoad }
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
