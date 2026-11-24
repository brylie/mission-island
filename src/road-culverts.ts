import { roadDrainage } from './assets/geometry/road-kinds.ts'
import type { Point } from './world.ts'

// Culverts: where grading leaves a hollow that would hold water, a pipe takes it under or
// past the road. A road builder places one wherever a fill crosses a draw or a road dips in a
// cut; here they are found the same way, by looking for low spots the grading made that the
// natural ground did not have. Each culvert's outlet is where the natural ground, followed
// downhill from its inlet, leaves the earthworks, or failing that the nearest lower ground.

export interface Culvert {
  road: string
  // Metres along the road nearest the inlet.
  along: number
  inlet: Point
  outlet: Point
}

const { stepM, groupM, sinkM, outletSteps, pipeReachM } = roadDrainage
// Eight directions round a circle of one step, as water running downhill would test them.
const directions = 8
const fullTurn = Math.PI + Math.PI
const neighbours = Array.from({ length: directions }, (_, k) => [Math.cos(k * fullTurn / directions), Math.sin(k * fullTurn / directions)] as const)

// No neighbour lower: a hollow may have a flat floor, as a road's shoulder does.
function lowest(point: Point, ground: (point: Point) => number) {
  const here = ground(point)
  return neighbours.every(([dx, dz]) => ground({ x: point.x + dx * stepM, z: point.z + dz * stepM }) >= here)
}

// Where water leaving the inlet ends up: down the natural ground until it is past the earthworks.
function outletFrom(inlet: Point, natural: (point: Point) => number, graded: (point: Point) => number) {
  let at = inlet
  for (let step = 0; step < outletSteps; step++) {
    let next = at
    for (const [dx, dz] of neighbours) {
      const q = { x: at.x + dx * stepM, z: at.z + dz * stepM }
      if (natural(q) < natural(next)) next = q
    }
    // Past the earthworks and lower than the inlet: the water runs on from here.
    if (Math.abs(graded(at) - natural(at)) < sinkM && graded(at) < graded(inlet)) return at
    if (next === at) break
    at = next
  }
  return nearestLower(inlet, natural, graded)
}

// A sag in a cut can sit below all the natural ground nearby. Its culvert runs to the nearest
// point, ring by ring, that the earthworks leave alone and that lies below the inlet.
function nearestLower(inlet: Point, natural: (point: Point) => number, graded: (point: Point) => number) {
  const floor = graded(inlet) - sinkM
  for (let r = stepM; r <= pipeReachM; r += stepM) {
    const around = Math.ceil(fullTurn * r / stepM)
    for (let k = 0; k < around; k++) {
      const at = { x: inlet.x + Math.cos(k * fullTurn / around) * r, z: inlet.z + Math.sin(k * fullTurn / around) * r }
      if (natural(at) < floor && Math.abs(graded(at) - natural(at)) < sinkM) return at
    }
  }
  return undefined
}

export function findCulverts(points: readonly Point[], natural: (point: Point) => number, graded: (point: Point) => number, nearestRoad: (point: Point) => { road: string, along: number }): Culvert[] {
  const found: Culvert[] = []
  for (const point of points) {
    // A hollow the grading made: low in the graded ground, but not in the natural ground.
    if (!lowest(point, graded) || lowest(point, natural)) continue
    const outlet = outletFrom(point, natural, graded)
    if (!outlet) continue
    const near = found.find((culvert) => Math.hypot(culvert.inlet.x - point.x, culvert.inlet.z - point.z) < groupM)
    if (near && graded(near.inlet) <= graded(point)) continue
    if (near) found.splice(found.indexOf(near), 1)
    found.push({ ...nearestRoad(point), inlet: point, outlet })
  }
  return found
}
