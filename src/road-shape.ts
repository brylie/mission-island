import { roadProfileSolver } from './assets/geometry/route-profiles.ts'
import type { Point } from './world.ts'

// A road's centreline from the dots a designer places and how far each stretch
// between two dots is bent. A stretch's bend sets a hidden middle point, that many
// metres to the left (+) or right (−) of the straight line between its two dots, and
// the road is one smooth Catmull-Rom curve through every dot and every middle. So a
// road with no bends runs straight between dots and round them, and a bend moves a
// stretch's middle by exactly the bend. Designers never see handles: they drag dots
// and the middle of a stretch.

interface RoadPlan {
  points: readonly Point[]
  // One per stretch between two dots: metres the stretch's middle moves left (+) or right (−).
  bends: readonly number[]
}

export interface RoadSample extends Point {
  // Metres along the road from its first dot.
  along: number
  // Unit direction of travel.
  dx: number
  dz: number
  // Which stretch the sample lies on.
  stretch: number
}

const half = 0.5
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })
const hermiteSteps = 24
const minimumSamples = 2
// The turning radius at a sample comes from the circle through it and the samples this many steps either side.
const radiusSpan = 3
const cubicA = 2, cubicB = 3

function leftOf(a: Point, b: Point) {
  const length = Math.hypot(b.x - a.x, b.z - a.z) || 1
  return { x: -(b.z - a.z) / length, z: (b.x - a.x) / length }
}

// Where the middle of a stretch lies: what a designer drags to bend it.
export function stretchMiddle({ points, bends }: RoadPlan, i: number): Point {
  const a = points[i], b = points[i + 1]
  const left = leftOf(a, b), bend = bends[i] ?? 0
  return { x: (a.x + b.x) * half + left.x * bend, z: (a.z + b.z) * half + left.z * bend }
}

// The bend that puts a stretch's middle level with `target`, measured sideways from the straight line.
export function bendToward({ points }: RoadPlan, i: number, target: Point) {
  const a = points[i], b = points[i + 1]
  const left = leftOf(a, b)
  return (target.x - (a.x + b.x) * half) * left.x + (target.z - (a.z + b.z) * half) * left.z
}

// Every dot and every stretch's middle, in order, with the stretch each knot ends.
function knots(plan: RoadPlan) {
  const out: (Point & { stretch: number })[] = [{ ...plan.points[0], stretch: 0 }]
  for (let i = 0; i < plan.points.length - 1; i++) out.push({ ...stretchMiddle(plan, i), stretch: i }, { ...plan.points[i + 1], stretch: i })
  return out
}

// Points along a Catmull-Rom curve through the knots, as cubic Hermite pieces. Tangents
// follow the chord lengths either side of each knot (non-uniform Catmull-Rom), so a short
// piece next to a long one never overshoots into a loop or a cusp.
function curvePoints(plan: RoadPlan) {
  const k = knots(plan)
  const span = (i: number) => Math.hypot(k[i + 1].x - k[i].x, k[i + 1].z - k[i].z) || 1
  // The curve's direction at a knot, per metre of chord.
  const slopeAt = (i: number) => {
    if (i === 0) return { x: (k[1].x - k[0].x) / span(0), z: (k[1].z - k[0].z) / span(0) }
    const last = k.length - 1
    if (i === last) return { x: (k[last].x - k[last - 1].x) / span(last - 1), z: (k[last].z - k[last - 1].z) / span(last - 1) }
    const run = span(i - 1) + span(i)
    return { x: (k[i + 1].x - k[i - 1].x) / run, z: (k[i + 1].z - k[i - 1].z) / run }
  }
  const out: (Point & { stretch: number })[] = [k[0]]
  for (let i = 0; i < k.length - 1; i++) {
    const p0 = k[i], p1 = k[i + 1], length = span(i)
    const s0 = slopeAt(i), s1 = slopeAt(i + 1)
    const m0 = { x: s0.x * length, z: s0.z * length }, m1 = { x: s1.x * length, z: s1.z * length }
    for (let step = 1; step <= hermiteSteps; step++) {
      const t = step / hermiteSteps, t2 = t * t, t3 = t2 * t
      const h00 = cubicA * t3 - cubicB * t2 + 1, h10 = t3 - cubicA * t2 + t, h01 = -cubicA * t3 + cubicB * t2, h11 = t3 - t2
      out.push({ x: h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x, z: h00 * p0.z + h10 * m0.z + h01 * p1.z + h11 * m1.z, stretch: p1.stretch })
    }
  }
  return out
}

// Evenly spaced samples along the whole road, every `step` metres, with direction.
export function sampleRoad(plan: RoadPlan, step: number = roadProfileSolver.sampleStepM): RoadSample[] {
  if (plan.points.length < minimumSamples) return []
  const fine = curvePoints(plan)
  if (fine.length < minimumSamples) return []
  const samples: RoadSample[] = []
  let along = 0, next = 0
  for (let k = 1; k < fine.length; k++) {
    const a = fine[k - 1], b = fine[k]
    const length = Math.hypot(b.x - a.x, b.z - a.z)
    if (!length) continue
    while (next <= along + length) {
      const t = (next - along) / length
      samples.push({ ...lerp(a, b, t), along: next, dx: (b.x - a.x) / length, dz: (b.z - a.z) / length, stretch: b.stretch })
      next += step
    }
    along += length
  }
  const last = fine[fine.length - 1], before = samples[samples.length - 1]
  // The road always ends exactly on its last dot.
  const end = { x: last.x, z: last.z, along, dx: before.dx, dz: before.dz, stretch: last.stretch }
  if (along - before.along > step * half) samples.push(end)
  else samples[samples.length - 1] = end
  return samples
}

// The tightest turning radius at each sample, from the circle through it and its neighbours `span` samples away.
export function turnRadii(samples: readonly RoadSample[], span = radiusSpan) {
  return samples.map((_, i) => {
    const a = samples[i - span], b = samples[i], c = samples[i + span]
    if (!a || !c) return Infinity
    const ab = Math.hypot(b.x - a.x, b.z - a.z), bc = Math.hypot(c.x - b.x, c.z - b.z), ca = Math.hypot(a.x - c.x, a.z - c.z)
    const cross = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x))
    return cross ? ab * bc * ca / (cross + cross) : Infinity
  })
}
