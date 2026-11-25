import { roadKinds, type RoadKind } from './assets/geometry/road-kinds.ts'
import { depotLane, harborRoad } from './paved-roads.ts'
import { samplePolyline, sampleRoad, type RoadSample } from './road-shape.ts'
import type { StarterRoadLayout } from './worlds/starter/layout/roads.ts'

// The island's roads as one network: the village's paved roads and the graded roads laid in the
// Workbench, in that order, with the junctions where they meet. A road whose end lies on the
// carriageway of a road before it joins that road there; the grading and the road surface then
// treat the two as one, so a junction has no step, seam or overlap.

export interface NetworkRoad {
  id: string
  name: string
  kind: RoadKind
  samples: RoadSample[]
  // The designer's layout, for graded roads.
  layout?: StarterRoadLayout
}

export interface Junction {
  // Indexes into the network's roads. The host always comes before the branch.
  branch: number
  host: number
  // Which end of the branch joins, and the host sample nearest it.
  end: 'start' | 'end'
  hostSample: number
}

export interface RoadNetwork {
  roads: NetworkRoad[]
  junctions: Junction[]
}

// A road end counts as on its host when it is within the host's carriageway, plus this much slack.
const joinSlackM = 0.5
const half = 0.5

export const pavedRoads = (): NetworkRoad[] => [
  { id: 'harbor-road', name: 'Harbor Depot road', kind: 'paved', samples: samplePolyline(harborRoad) },
  { id: 'depot-lane', name: 'Depot lane', kind: 'paved', samples: samplePolyline(depotLane) },
]

export const halfWidthOf = (road: NetworkRoad) => roadKinds[road.kind].width * half
export const halfFormationOf = (road: NetworkRoad) => halfWidthOf(road) + roadKinds[road.kind].shoulderWidth

function nearestSample(samples: readonly RoadSample[], point: { x: number, z: number }) {
  let best = -1, bestDistance = Infinity
  samples.forEach((sample, i) => {
    const d = Math.hypot(sample.x - point.x, sample.z - point.z)
    if (d < bestDistance) [best, bestDistance] = [i, d]
  })
  return { index: best, distance: bestDistance }
}

// The host a road end joins: the nearest earlier road whose carriageway it lies on.
function hostOf(roads: readonly NetworkRoad[], branch: number, end: RoadSample) {
  let found: { host: number, hostSample: number, distance: number } | undefined
  for (let host = 0; host < branch; host++) {
    const { index, distance } = nearestSample(roads[host].samples, end)
    if (distance <= halfWidthOf(roads[host]) + joinSlackM && (!found || distance < found.distance)) found = { host, hostSample: index, distance }
  }
  return found
}

export function buildRoadNetwork(layouts: readonly StarterRoadLayout[], paved: readonly NetworkRoad[] = pavedRoads()): RoadNetwork {
  const graded = layouts.filter((layout) => layout.points.length > 1).map((layout): NetworkRoad => ({ id: layout.id, name: layout.name, kind: layout.kind, samples: sampleRoad(layout), layout }))
  const roads = [...paved, ...graded].filter((road) => road.samples.length > 1)
  const junctions: Junction[] = []
  roads.forEach((road, branch) => {
    for (const end of ['start', 'end'] as const) {
      const found = hostOf(roads, branch, end === 'start' ? road.samples[0] : road.samples[road.samples.length - 1])
      if (found) junctions.push({ branch, host: found.host, end, hostSample: found.hostSample })
    }
  })
  return { roads, junctions }
}
