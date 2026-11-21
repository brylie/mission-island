import { beach, distance, ferryTerminal, harbor, lookout } from './world.ts'
import { meadowFoot, meadowHill } from './terrain.ts'
import type { Point } from './world.ts'

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
}

function roundCorners(points: readonly Point[], trim: number): Point[] {
  const path = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const [before, corner, after] = points.slice(i - 1, i + 2)
    const incoming = distance(corner, before)
    const outgoing = distance(corner, after)
    const inset = Math.min(trim, incoming * 0.45, outgoing * 0.45)
    const start = lerp(corner, before, inset / incoming)
    const end = lerp(corner, after, inset / outgoing)
    for (let step = 0; step <= 12; step++) {
      const t = step / 12
      path.push(lerp(lerp(start, corner, t), lerp(corner, end, t), t))
    }
  }
  path.push(points[points.length - 1])
  return path
}

// Harbor Depot road runs from the ferry ramp, straight north past the freight yard, then curves away to Seabrook.
// Its points run from the ramp end so the ramp lane stays one straight segment on the terminal's centreline.
export const harborRoad = roundCorners([
  { x: ferryTerminal.x, z: ferryTerminal.z }, { x: ferryTerminal.x, z: -10 }, { x: 10, z: 12 }, { x: 51, z: 12 },
], 9.5)

function crossingAt(path: readonly Point[], z: number): Point {
  const i = path.findIndex((point) => point.z >= z)
  const a = path[i - 1], b = path[i]
  return lerp(a, b, (z - a.z) / (b.z - a.z))
}

// The depot lane leaves Harbor Depot road at the fork and runs west past the depot to the cottages.
const depotLaneZ = -11
export const depotJunction = crossingAt(harborRoad, depotLaneZ)
export const depotLane: Point[] = [{ x: -55, z: depotLaneZ }, depotJunction]
export const roads = [harborRoad, depotLane]

export function distanceToRoads(point: Point) {
  return Math.min(...roads.map((path) => distanceToRoute(point, path)))
}

export const shellglassPoint = { x: 43.2, z: -31.4 }

export const splitstone = { x: 53.5, z: -20.8 }

export const roadSurface = { width: 6, shoulderWidth: 1.4, shoulder: .056, asphalt: .084 }
export const sidewalkLift = .065
export const trailLift = .039

export type PathSurface = 'gravel' | 'pavement' | 'desire'
interface Footpath { name: string; width: number; surface: PathSurface; points: Point[] }

export const meadowPath: Footpath = {
  name: 'Meadow slope path', width: 1.35, surface: 'desire',
  points: roundCorners([{ x: -27, z: 8 }, meadowFoot, { x: -26.6, z: 17 }, meadowHill], 1.8),
}

export const beachTrail: Footpath = {
  name: 'Beach trail', surface: 'pavement', width: 2.6,
  points: roundCorners([{ x: 35, z: 12 }, { x: 33.1, z: 4 }, { x: 29.6, z: -24.7 }, beach], 4),
}

export const juniperTrail: Footpath = {
  name: 'Juniper trail', surface: 'desire', width: 1.2,
  points: roundCorners([
    { x: -48.55, z: -10.9 }, { x: -48.55, z: -.8 }, { x: -49, z: 9 },
    { x: -52, z: 21 }, { x: -54, z: 33 }, { x: -54.5, z: 52 },
    { x: -54.5, z: 65.9 }, { x: -53.45, z: 68 }, { x: -54.5, z: 70 },
    { x: -54.8, z: 73 }, { x: -54.65, z: 75.9 },
  ], 2),
}

export const footpaths: Footpath[] = [
  { name: 'Lookout trail', surface: 'gravel', width: 3.2, points: roundCorners([{ x: 17, z: 12 }, { x: 20, z: 22 }, lookout], 4) },
  beachTrail,
  { name: 'Harbor trail', surface: 'gravel', width: 3.1, points: roundCorners([{ x: -46, z: -11 }, harbor, { x: -44, z: -30 }], 3) },
  { name: 'Splitstone strand', surface: 'desire', width: .85, points: roundCorners([
    { x: 41.7, z: -30.2 }, { x: 44.1, z: -29.05 }, { x: 45.85, z: -28.25 },
  ], 1) },
  { name: 'Driftwood shore walk', surface: 'desire', width: 1.1, points: roundCorners([
    { x: 30.1, z: -24.7 }, { x: 34.7, z: -26.3 }, { x: 39, z: -29.2 }, { x: 42.6, z: -30.68 },
  ], 1.1) },
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
  for (let start = 2; start + 2 < lengths[lengths.length - 1]; start += 4.2) {
    const end = start + 1.65
    markings.push([
      pointAt(start),
      ...path.filter((_, i) => lengths[i] > start && lengths[i] < end),
      pointAt(end),
    ])
  }
  return markings
}

export function ribbonGeometry(strips: ReadonlyArray<readonly Point[]>, width: number, y: number) {
  const positions: number[] = []
  const indices: number[] = []
  for (const points of strips) {
    const base = positions.length / 3
    for (const [i, point] of points.entries()) {
      const before = points[Math.max(0, i - 1)]
      const after = points[Math.min(i + 1, points.length - 1)]
      const halfWidth = width / (2 * distance(before, after))
      const x = (before.z - after.z) * halfWidth
      const z = (after.x - before.x) * halfWidth
      positions.push(point.x + x, y, point.z + z, point.x - x, y, point.z - z)
      if (i > 0) {
        const a = base + (i - 1) * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
  }
  return { positions, indices }
}

const sidewalkWidth = 1.55
const southSidewalkZ = 8.24
const southSidewalkEdge = southSidewalkZ - sidewalkWidth / 2

export const walkways = [
  { name: 'North Seabrook pavement', width: sidewalkWidth, points: [{ x: 30, z: 15.76 }, { x: 51, z: 15.76 }] },
  { name: 'South Seabrook pavement', width: sidewalkWidth, points: [{ x: 31, z: southSidewalkZ }, { x: 51, z: southSidewalkZ }] },
  { name: 'South house walk', width: 1.5, points: [{ x: 39, z: southSidewalkEdge }, { x: 39, z: 5.28 }] },
  { name: 'East house walk', width: 1.4, points: [{ x: 48, z: southSidewalkEdge }, { x: 48, z: 5.28 }] },
  ...[35, 43, 50].map((x) => ({
    name: 'Seabrook front walk ' + x, width: 1.1,
    points: [{ x, z: 15.76 + sidewalkWidth / 2 }, { x, z: x === 50 ? 19.22 : 19.32 }],
  })),
]
