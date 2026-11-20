import { beach, distance, harbor, lookout } from './world.ts'
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

export const road = roundCorners([
  { x: -55, z: -11 }, { x: -19, z: -11 }, { x: 10, z: 12 }, { x: 51, z: 12 },
], 7)

export const footpaths = [
  { name: 'Lookout trail', width: 3.2, points: roundCorners([{ x: 17, z: 12 }, { x: 20, z: 22 }, lookout], 4) },
  { name: 'Beach trail', width: 2.6, points: roundCorners([{ x: 35, z: 12 }, { x: 33.1, z: 4 }, beach], 4) },
  { name: 'Harbor trail', width: 3.1, points: roundCorners([{ x: -46, z: -11 }, harbor, { x: -44, z: -30 }], 3) },
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
  { name: 'South house walk', width: 1.5, points: roundCorners([{ x: 35.2, z: southSidewalkEdge }, { x: 35.2, z: 1.7 }, { x: 40.2, z: 1.7 }], 1.45) },
  { name: 'East house walk', width: 1.4, points: roundCorners([{ x: 44.5, z: southSidewalkEdge }, { x: 44.5, z: 2 }, { x: 49, z: 2 }], 1.4) },
]
