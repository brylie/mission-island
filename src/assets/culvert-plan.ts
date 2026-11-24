import type { Culvert } from '../road-culverts.ts'
import type { Point } from '../world.ts'
import { culvertModel as model } from './geometry/culverts.ts'

// Where each culvert's ends are built, as forest-road cross-drains are: an inlet beside the road
// takes a headwall, one in a cut or on the road a drop inlet off the carriageway; the outlet's
// headwall stands where the pipe leaves the fill. Ends closer than `shareM` share one structure.

const fullTurn = Math.PI + Math.PI

export interface RoadQueries {
  // Metres to the nearest graded road's formation edge, and to any road's carriageway edge
  // (negative inside); and how far the grading moved the ground.
  clearance: (point: Point) => number
  carriageway: (point: Point) => number
  earthworks: (point: Point) => number
}

// The nearest spot to `from`, within reach, that is off the carriageway.
function offCarriageway(from: Point, roads: RoadQueries) {
  if (roads.carriageway(from) > model.dropClearM) return from
  for (let r = model.searchStepM; r <= model.dropSearchM; r += model.searchStepM) {
    for (let k = 0; k < model.dropDirections; k++) {
      const at = { x: from.x + Math.cos(k * fullTurn / model.dropDirections) * r, z: from.z + Math.sin(k * fullTurn / model.dropDirections) * r }
      if (roads.carriageway(at) > model.dropClearM) return at
    }
  }
  return undefined
}

// Where the pipe leaves the fill: along its line from the inlet, once it has passed under the road,
// the first spot clear of the formation where the ground is as nature left it.
function fillToe(inlet: Point, along: Point, reach: number, roads: RoadQueries) {
  let crossed = false
  for (let d = 0; d <= reach; d += model.searchStepM) {
    const at = { x: inlet.x + along.x * d, z: inlet.z + along.z * d }
    if (roads.clearance(at) <= model.clearOfRoadM) crossed = true
    else if (crossed && roads.earthworks(at) < model.toeM) return at
  }
  return undefined
}

export interface CulvertEnd {
  culvert: number
  kind: 'inlet' | 'drop-inlet' | 'outlet'
  at: Point
  // The way the structure's open face looks: up the pipe at an inlet, down it at an outlet.
  facing: Point
}

export function planCulverts(culverts: readonly Culvert[], roads: RoadQueries): CulvertEnd[] {
  const ends: CulvertEnd[] = []
  const fresh = (at: Point) => !ends.some((end) => Math.hypot(end.at.x - at.x, end.at.z - at.z) < model.shareM)
  culverts.forEach(({ inlet, outlet }, culvert) => {
    if (!outlet) return
    const length = Math.hypot(outlet.x - inlet.x, outlet.z - inlet.z)
    if (length < Number.EPSILON) return
    const along = { x: (outlet.x - inlet.x) / length, z: (outlet.z - inlet.z) / length }
    const up = { x: -along.x, z: -along.z }
    if (roads.clearance(inlet) > model.clearOfRoadM) {
      if (fresh(inlet)) ends.push({ culvert, kind: 'inlet', at: inlet, facing: up })
    }
    else {
      const basin = offCarriageway(inlet, roads)
      if (basin && fresh(basin)) ends.push({ culvert, kind: 'drop-inlet', at: basin, facing: along })
    }
    const toe = fillToe(inlet, along, length + model.searchM, roads) ?? outlet
    if (fresh(toe)) ends.push({ culvert, kind: 'outlet', at: toe, facing: along })
  })
  return ends
}
