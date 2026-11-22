import {
  accessLaneLayouts,
  connectingRoadLayouts,
  ferryApproachLayout,
  ferryDeckLayout,
  fishingPierLayout,
  islandLoopLayout,
  type RouteKnot,
  type RouteLayout,
} from '../worlds/saltwind/layout/routes.ts'
import type { MapPoint } from './sites.ts'

interface RoadPoint extends MapPoint { y: number }
export interface RoadSample extends RoadPoint { distance: number, yaw: number }

const tangentScale = 0.5
const quadraticStartWeight = 2
const quadraticMiddleWeight = 5
const quadraticEndWeight = 4
const cubicMiddleWeight = 3

function catmullRom(a: number, b: number, c: number, d: number, t: number) {
  const quadratic = quadraticStartWeight * a - quadraticMiddleWeight * b + quadraticEndWeight * c - d
  const cubic = cubicMiddleWeight * b - cubicMiddleWeight * c + d - a
  return b + tangentScale * t * (c - a + t * (quadratic + t * cubic))
}

function sampleKnots(knots: readonly RouteKnot[], closed: boolean): RoadSample[] {
  const samples: RoadSample[] = []
  const get = (i: number) => knots[closed ? (i + knots.length) % knots.length : Math.max(0, Math.min(knots.length - 1, i))]
  const append = (x: number, z: number, y: number) => {
    const last = samples.at(-1)
    samples.push({ x, z, y, yaw: 0, distance: last ? last.distance + Math.hypot(x - last.x, z - last.z) : 0 })
  }
  const count = closed ? knots.length : knots.length - 1
  for (let i = 0; i < count; i++) {
    const next = i + 1
    const a = get(i - 1), b = get(i), c = get(next), d = get(next + 1)
    const steps = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]))
    for (let j = 0; j < steps; j++) {
      const t = j / steps
      append(catmullRom(a[0], b[0], c[0], d[0], t), catmullRom(a[1], b[1], c[1], d[1], t), catmullRom(a[2], b[2], c[2], d[2], t))
    }
  }
  append(...get(count))
  const lastSampleIndex = samples.length - 1
  samples.forEach((sample, i) => {
    const before = samples[i - 1] ?? (closed ? samples[lastSampleIndex - 1] : sample)
    const after = samples[i + 1] ?? (closed ? samples[1] : sample)
    sample.yaw = Math.atan2(after.x - before.x, after.z - before.z)
  })
  return samples
}

export interface Route { name: string, width: number, samples: RoadSample[], crossings: boolean }
const route = ({ name, width, knots, closed = false, crossings = false }: RouteLayout): Route =>
  ({ name, width, samples: sampleKnots(knots, closed), crossings })

export const islandLoop = route(islandLoopLayout)
export const quayRoad = route(ferryApproachLayout)

function fromLoop(x: number, z: number): RouteKnot {
  const point = islandLoop.samples.reduce((nearest, p) =>
    Math.hypot(p.x - x, p.z - z) < Math.hypot(nearest.x - x, nearest.z - z) ? p : nearest)
  return [point.x, point.z, point.y]
}

export const accessLanes = accessLaneLayouts.map(({ join: [x, z], knots, ...layout }) =>
  route({ ...layout, knots: [fromLoop(x, z), ...knots] }))
export const routes = [islandLoop, quayRoad, ...connectingRoadLayouts.map(route), ...accessLanes]

export function sampleRoute(route: Route, distance: number): RoadSample {
  const samples = route.samples
  let low = 0, high = samples.length - 1
  const target = Math.max(0, Math.min(distance, samples[high].distance))
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (samples[middle].distance < target) low = middle
    else high = middle
  }
  const a = samples[low], b = samples[high]
  const t = (target - a.distance) / (b.distance - a.distance)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, yaw: a.yaw + Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)) * t, distance: target }
}

export const fishingPier = route(fishingPierLayout)
export const ferryTrack = route(ferryDeckLayout)
