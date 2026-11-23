import type { Point } from '../../../world.ts'

// Traces the shoreline as ordered, closed loops with marching squares: the
// contour where ground crosses the waterline, sampled every `step` metres over
// `bounds`. Each loop is resampled to roughly `spacing` metres between points,
// and loops shorter than `minimumLength` (rocks awash) are dropped.

interface Bounds { west: number, east: number, south: number, north: number }

const half = 0.5
// Corner bits: south-west, south-east, north-east, north-west.
const southWest = 1, southEast = 2, northEast = 4, northWest = 8
// Edges of a cell.
const south = 0, east = 1, north = 2, west = 3
const saddleSwNe = southWest | northEast, saddleSeNw = southEast | northWest
const saddleCases = new Set([saddleSwNe, saddleSeNw])
// The edge pairs each corner pattern crosses, with land on the left.
const caseEdges: Record<number, readonly (readonly [number, number])[]> = {
  [southWest]: [[west, south]],
  [southEast]: [[south, east]],
  [southWest | southEast]: [[west, east]],
  [northEast]: [[east, north]],
  [southEast | northEast]: [[south, north]],
  [southWest | southEast | northEast]: [[west, north]],
  [northWest]: [[north, west]],
  [southWest | northWest]: [[north, south]],
  [southWest | southEast | northWest]: [[north, east]],
  [northEast | northWest]: [[east, west]],
  [southWest | northEast | northWest]: [[east, south]],
  [southEast | northEast | northWest]: [[south, west]],
}

export function traceShoreline(height: (point: Point) => number, level: number, bounds: Bounds, step: number, spacing: number, minimumLength: number) {
  const columns = Math.ceil((bounds.east - bounds.west) / step) + 1
  const rows = Math.ceil((bounds.north - bounds.south) / step) + 1
  const values = new Float32Array(columns * rows)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) values[j * columns + i] = height({ x: bounds.west + i * step, z: bounds.south + j * step }) - level
  }
  const at = (i: number, j: number) => values[j * columns + i]
  // A point on an edge where the ground crosses the level. Edges are keyed so neighbouring cells share them.
  const edgeKey = (i: number, j: number, edge: number) => edge === south ? `h${i},${j}` : edge === north ? `h${i},${j + 1}` : edge === west ? `v${i},${j}` : `v${i + 1},${j}`
  const edgePoint = (i: number, j: number, edge: number): Point => {
    const [ax, az, bx, bz] = edge === south ? [i, j, i + 1, j] : edge === north ? [i, j + 1, i + 1, j + 1] : edge === west ? [i, j, i, j + 1] : [i + 1, j, i + 1, j + 1]
    const a = at(ax, az), b = at(bx, bz)
    const t = a / (a - b)
    return { x: bounds.west + (ax + (bx - ax) * t) * step, z: bounds.south + (az + (bz - az) * t) * step }
  }
  const links = new Map<string, string[]>()
  const points = new Map<string, Point>()
  const join = (a: string, b: string) => {
    for (const [from, to] of [[a, b], [b, a]]) {
      const list = links.get(from) ?? []
      list.push(to)
      links.set(from, list)
    }
  }
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < columns - 1; i++) {
      const code = (at(i, j) > 0 ? southWest : 0) | (at(i + 1, j) > 0 ? southEast : 0) | (at(i + 1, j + 1) > 0 ? northEast : 0) | (at(i, j + 1) > 0 ? northWest : 0)
      let pairs = caseEdges[code] ?? []
      if (saddleCases.has(code)) {
        // A saddle joins whichever corners the cell's centre agrees with.
        const centre = (at(i, j) + at(i + 1, j) + at(i + 1, j + 1) + at(i, j + 1)) * half * half > 0
        pairs = (code === saddleSwNe) === centre ? [[west, north], [east, south]] : [[west, south], [east, north]]
      }
      for (const [a, b] of pairs) {
        const ka = edgeKey(i, j, a), kb = edgeKey(i, j, b)
        if (!points.has(ka)) points.set(ka, edgePoint(i, j, a))
        if (!points.has(kb)) points.set(kb, edgePoint(i, j, b))
        join(ka, kb)
      }
    }
  }
  const visited = new Set<string>()
  const loops: Point[][] = []
  for (const start of links.keys()) {
    if (visited.has(start)) continue
    const loop: Point[] = []
    let previous: string | undefined, current: string | undefined = start
    while (current !== undefined && !visited.has(current)) {
      visited.add(current)
      loop.push(points.get(current)!)
      const next: string | undefined = links.get(current)!.find((key) => key !== previous && !visited.has(key))
      previous = current
      current = next
    }
    const resampled = resample(loop, spacing)
    if (resampled.length * spacing >= minimumLength) loops.push(resampled)
  }
  return loops.sort((a, b) => b.length - a.length)
}

// Even spacing along a closed loop.
function resample(loop: readonly Point[], spacing: number) {
  const out: Point[] = []
  let carried = 0
  for (let k = 0; k < loop.length; k++) {
    const a = loop[k], b = loop[(k + 1) % loop.length]
    const length = Math.hypot(b.x - a.x, b.z - a.z)
    let along = carried
    while (along < length) {
      out.push({ x: a.x + (b.x - a.x) * along / length, z: a.z + (b.z - a.z) * along / length })
      along += spacing
    }
    carried = along - length
  }
  return out
}
