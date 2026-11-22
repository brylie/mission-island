import { jobs } from './jobs.ts'
import type { Snapshot } from './protocol.ts'
import { beachTrail, depotLane, harborRoad } from './routes.ts'
import { groundHeight } from './terrain.ts'
import { waypointsAlongPath } from './wayfinding.ts'
import { distance, harbor, town, type Point } from './world.ts'

const deliveryOrbHeight = 0.85
const deliveryOrbSpacing = 5
const deliveryEndGap = 2.5

function routeUntil(path: Point[], end: Point) {
  let nearest = Infinity
  let segment = 0
  let point = path[0]
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i]
    const dx = b.x - a.x, dz = b.z - a.z
    const t = Math.max(0, Math.min(1, ((end.x - a.x) * dx + (end.z - a.z) * dz) / (dx * dx + dz * dz)))
    const projected = { x: a.x + dx * t, z: a.z + dz * t }
    const gap = distance(projected, end)
    if (gap >= nearest) continue
    nearest = gap
    segment = i
    point = projected
  }
  return [...path.slice(0, segment), point]
}

// From the depot, deliveries follow the depot lane east to the fork, then Harbor Depot road to Seabrook.
const trunk = [{ x: harbor.x, z: depotLane[0].z }, ...depotLane.slice(1), ...harborRoad.filter(({ z }) => z > depotLane[0].z)]
const branch = routeUntil(trunk, beachTrail.points[0])
const farmDrop = jobs['farm-supplies'].drop
const beachDrop = jobs['beach-gear'].drop

export const deliveryWaypoints = {
  'delivery': makeWaypoints(routeUntil(trunk, town)),
  'farm-supplies': makeWaypoints([...branch, ...routeUntil(beachTrail.points, farmDrop), farmDrop]),
  'beach-gear': makeWaypoints([...branch, ...routeUntil(beachTrail.points, beachDrop)]),
}

function makeWaypoints(path: Point[]) {
  const surface = path.map((point) => ({ ...point, y: groundHeight(point) + deliveryOrbHeight }))
  const points = waypointsAlongPath(surface, deliveryOrbSpacing)
  const end = surface.at(-1)
  const last = points.at(-1)
  if (end && last && distance(end, last) > deliveryEndGap) points.push(end)
  return points
}

export function loadedDeliveryRoute(state?: Pick<Snapshot, 'items' | 'mission' | 'jobs'>) {
  if (!state?.items.some((item) => item.kind === 'crate' && item.onBed && !item.delivered)) return
  if (state.mission === 'delivery') return 'delivery'
  const id = state.jobs.active?.id
  if (id === 'farm-supplies' || id === 'beach-gear') return id
}
