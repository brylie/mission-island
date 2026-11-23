import type { Point } from './world.ts'

// A spatial index over every road's samples, for "which stretches of road are near this point".
// Samples are filed in square buckets; a query visits the buckets a circle touches.

interface Leg { road: number, sample: number }

const square = 2

export function createSampleIndex(roads: readonly (readonly Point[])[], bucketM: number) {
  const xs = roads.flatMap((samples) => samples.map((point) => point.x)), zs = roads.flatMap((samples) => samples.map((point) => point.z))
  const west = Math.min(...xs), south = Math.min(...zs)
  const columns = Math.floor((Math.max(...xs) - west) / bucketM) + 1, rows = Math.floor((Math.max(...zs) - south) / bucketM) + 1
  const bucketOf = ({ x, z }: Point) => Math.floor((z - south) / bucketM) * columns + Math.floor((x - west) / bucketM)
  // Compressed rows: bucket b holds entries starts[b] to starts[b + 1], each a (road, sample) pair.
  const starts = new Int32Array(columns * rows + 1)
  for (const samples of roads) for (const point of samples) starts[bucketOf(point) + 1]++
  for (let b = 0; b < columns * rows; b++) starts[b + 1] += starts[b]
  const fill = starts.slice(0, -1)
  const entryRoad = new Int32Array(xs.length), entrySample = new Int32Array(xs.length)
  roads.forEach((samples, road) => {
    samples.forEach((point, sample) => {
      const e = fill[bucketOf(point)]++
      entryRoad[e] = road
      entrySample[e] = sample
    })
  })
  const distanceSquared = (road: number, sample: number, point: Point) => {
    const at = roads[road][sample]
    return at ? (at.x - point.x) ** square + (at.z - point.z) ** square : Infinity
  }
  // The nearest sample on each separate stretch of road within `radius`: a sample no further from
  // the point than the samples either side of it. Two legs of a switchback each give one.
  function legsNear(point: Point, radius: number): Leg[] {
    const legs: Leg[] = []
    const i0 = Math.max(0, Math.floor((point.x - radius - west) / bucketM)), i1 = Math.min(columns - 1, Math.floor((point.x + radius - west) / bucketM))
    const j0 = Math.max(0, Math.floor((point.z - radius - south) / bucketM)), j1 = Math.min(rows - 1, Math.floor((point.z + radius - south) / bucketM))
    const limit = radius * radius
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const b = j * columns + i
        for (let e = starts[b]; e < starts[b + 1]; e++) {
          const road = entryRoad[e], sample = entrySample[e]
          const d = distanceSquared(road, sample, point)
          if (d <= limit && d <= distanceSquared(road, sample - 1, point) && d < distanceSquared(road, sample + 1, point)) legs.push({ road, sample })
        }
      }
    }
    return legs
  }
  return { legsNear }
}
