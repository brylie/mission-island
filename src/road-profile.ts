import { roadProfileSolver } from './assets/geometry/route-profiles.ts'
import type { RoadSample } from './road-shape.ts'
import type { Point } from './world.ts'

// How a road finds its height through the terrain, as road builders balance cut
// and fill: start from the ground under the road, averaged across its width and
// smoothed along it, then hold the road within its grade limit with forward and
// backward passes, smoothing a little between them so there are no kinks. The
// road stays as close to the ground as its grade allows: it cuts into rises and
// fills hollows only where it must.

export interface RoadProfileSample extends RoadSample {
  // Height of the road's centre.
  y: number
  // Natural ground under the road, averaged across its width.
  ground: number
  // Rise per metre toward the next sample.
  grade: number
  // Positive where the road is cut below the ground, negative where it is filled above.
  cut: number
}

interface ProfileOptions {
  // The ground height at a point.
  groundAt: (point: Point) => number
  halfWidth: number
  // The steepest grade allowed at each sample (rise per metre).
  maxGrade: (sample: RoadSample) => number
  // Heights to hold the first or last sample at, where the road joins another.
  start?: number
  end?: number
}

const half = 0.5
// Across the road: both edges, halfway to each and the centre.
const acrossSamples = [-1, -half, 0, half, 1]

function smooth(values: readonly number[], along: readonly number[], spanM: number) {
  const out = new Array<number>(values.length)
  let from = 0, to = 0, sum = 0
  for (let i = 0; i < values.length; i++) {
    while (to < values.length && along[to] <= along[i] + spanM * half) sum += values[to++]
    while (along[from] < along[i] - spanM * half) sum -= values[from++]
    out[i] = sum / (to - from)
  }
  return out
}

function limitGrades(y: number[], samples: readonly RoadSample[], limits: readonly number[], fixed: readonly boolean[]) {
  for (let i = 1; i < y.length; i++) {
    if (fixed[i]) continue
    const run = (samples[i].along - samples[i - 1].along) * limits[i - 1]
    y[i] = Math.max(y[i - 1] - run, Math.min(y[i - 1] + run, y[i]))
  }
  for (let i = y.length - 1 - 1; i >= 0; i--) {
    if (fixed[i]) continue
    const run = (samples[i + 1].along - samples[i].along) * limits[i]
    y[i] = Math.max(y[i + 1] - run, Math.min(y[i + 1] + run, y[i]))
  }
}

export function solveRoadProfile(samples: readonly RoadSample[], { groundAt, halfWidth, maxGrade, start, end }: ProfileOptions): RoadProfileSample[] {
  if (!samples.length) return []
  const along = samples.map((sample) => sample.along)
  const ground = samples.map((sample) => acrossSamples.reduce((sum, share) => sum + groundAt({ x: sample.x - sample.dz * share * halfWidth, z: sample.z + sample.dx * share * halfWidth }), 0) / acrossSamples.length)
  const limits = samples.map(maxGrade)
  const fixed = samples.map((_, i) => (i === 0 && start !== undefined) || (i === samples.length - 1 && end !== undefined))
  let y = smooth(ground, along, roadProfileSolver.groundSmoothM)
  if (start !== undefined) y[0] = start
  if (end !== undefined) y[y.length - 1] = end
  for (let pass = 0; pass < roadProfileSolver.passes; pass++) {
    limitGrades(y, samples, limits, fixed)
    const smoothed = smooth(y, along, roadProfileSolver.passSmoothM)
    y = y.map((value, i) => fixed[i] ? value : smoothed[i])
  }
  limitGrades(y, samples, limits, fixed)
  return samples.map((sample, i) => {
    const next = samples[i + 1]
    const grade = next ? (y[i + 1] - y[i]) / Math.max(next.along - sample.along, Number.EPSILON) : (y[i] - (y[i - 1] ?? y[i])) / Math.max(sample.along - (samples[i - 1]?.along ?? 0), Number.EPSILON)
    return { ...sample, y: y[i], ground: ground[i], grade, cut: ground[i] - y[i] }
  })
}
