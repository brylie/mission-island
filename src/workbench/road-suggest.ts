import { roadSuggestion } from '../assets/recipes/workbench-roads.ts'
import { naturalGroundHeight, waterLevel } from '../terrain.ts'
import type { Point } from '../world.ts'

// Suggest route: a grade-limited path between two dots over the natural ground, as
// a road surveyor would walk it. The search judges grade on ground smoothed over a
// few cells, because a road is cut and filled through small bumps, and it avoids
// water. The path it finds is thinned to dots a designer can then drag and bend.

interface Grid { west: number, south: number, columns: number, rows: number, heights: Float32Array, wet: Uint8Array }

const { cellM, marginM, smoothPasses, gradeCostWeight, overGradeWeight, hardGradeShare, turnCostM, waterMarginM, simplifyToleranceM, maxDotSpacingM, minDotSpacingM } = roadSuggestion
// Steps to the eight neighbours and the eight knight's moves (one cell across, two along),
// sorted by direction, so the path is not tied to the grid's angles. Each step may turn
// only to a neighbouring direction, as a vehicle turns gradually: with 4 m cells that holds
// bends to about a 9 m radius, wide enough for the Fire and Rescue pickup, and a switchback
// has to be a real hairpin loop.
const knight = 2
const half = 0.5
// Bends are kept to a tenth of a metre.
const bendRounding = 10
const signs = [1, -1]
// A line of two points is already as simple as it gets.
const minimumLine = 2
const moves: readonly (readonly [number, number])[] = [
  ...signs.flatMap((a) => [[a, 0], [0, a]] as const),
  ...signs.flatMap((a) => signs.flatMap((b) => [[a, b], [knight * a, b], [a, knight * b]] as const)),
].sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]))
const turnsFrom = (h: number) => [h - 1, h, h + 1].map((k) => (k + moves.length) % moves.length)

// One pass of a three-by-three box blur.
function blur(source: Float32Array, columns: number, rows: number) {
  const out = new Float32Array(source.length)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      let sum = 0, count = 0
      for (let z = Math.max(0, j - 1); z <= Math.min(rows - 1, j + 1); z++) {
        for (let x = Math.max(0, i - 1); x <= Math.min(columns - 1, i + 1); x++) {
          sum += source[z * columns + x]
          count++
        }
      }
      out[j * columns + i] = sum / count
    }
  }
  return out
}

function groundGrid(a: Point, b: Point): Grid {
  const west = Math.min(a.x, b.x) - marginM, south = Math.min(a.z, b.z) - marginM
  const columns = Math.ceil((Math.max(a.x, b.x) + marginM - west) / cellM) + 1, rows = Math.ceil((Math.max(a.z, b.z) + marginM - south) / cellM) + 1
  let heights = new Float32Array(columns * rows)
  const wet = new Uint8Array(columns * rows)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const height = naturalGroundHeight({ x: west + i * cellM, z: south + j * cellM })
      heights[j * columns + i] = height
      wet[j * columns + i] = Number(height < waterLevel + waterMarginM)
    }
  }
  for (let pass = 0; pass < smoothPasses; pass++) heights = blur(heights, columns, rows)
  return { west, south, columns, rows, heights, wet }
}

class Queue {
  private readonly items: [number, number][] = []

  get size() { return this.items.length }
  push(cost: number, cell: number) {
    const items = this.items
    items.push([cost, cell])
    let c = items.length - 1
    while (c > 0) {
      const p = (c - 1) >> 1
      if (items[p][0] <= cost) break
      ;[items[p], items[c]] = [items[c], items[p]]
      c = p
    }
  }

  pop() {
    const items = this.items
    const top = items[0], last = items.pop()!
    if (items.length) {
      items[0] = last
      let p = 0
      for (;;) {
        const l = p + p + 1, r = l + 1
        let c = p
        if (l < items.length && items[l][0] < items[c][0]) c = l
        if (r < items.length && items[r][0] < items[c][0]) c = r
        if (c === p) break
        ;[items[p], items[c]] = [items[c], items[p]]
        p = c
      }
    }
    return top[1]
  }
}

// A* over (cell, heading) states: turning costs extra in proportion to how sharply the
// heading changes, so the path sweeps round bends a vehicle can take rather than zigzagging.
function search(grid: Grid, a: Point, b: Point, maxGrade: number) {
  const { west, south, columns, rows, heights, wet } = grid
  const headings = moves.length
  const cell = (p: Point) => Math.round((p.z - south) / cellM) * columns + Math.round((p.x - west) / cellM)
  const start = cell(a), goal = cell(b), gx = goal % columns, gz = Math.floor(goal / columns)
  const cost = new Float64Array(columns * rows * headings).fill(Infinity)
  const from = new Int32Array(columns * rows * headings).fill(-1)
  const lengths = moves.map(([dx, dz]) => Math.hypot(dx, dz))
  const open = new Queue()
  for (let h = 0; h < headings; h++) {
    cost[start * headings + h] = 0
    open.push(0, start * headings + h)
  }
  let reached = -1
  while (open.size) {
    const state = open.pop()
    const c = Math.floor(state / headings), h = state % headings
    if (c === goal) {
      reached = state
      break
    }
    const cx = c % columns, cz = Math.floor(c / columns)
    for (const k of turnsFrom(h)) {
      const [dx, dz] = moves[k]
      const nx = cx + dx, nz = cz + dz
      if (nx < 0 || nz < 0 || nx >= columns || nz >= rows) continue
      const n = nz * columns + nx
      if (wet[n] && n !== goal) continue
      const run = lengths[k] * cellM, grade = Math.abs(heights[n] - heights[c]) / run
      // Small bumps are cut and filled, so the limit is soft: steeper steps cost heavily, and only
      // ground far beyond the limit is refused.
      if (grade > maxGrade * hardGradeShare) continue
      const [hx, hz] = moves[h]
      const turn = 1 - (hx * dx + hz * dz) / (lengths[h] * lengths[k])
      const over = Math.max(0, grade - maxGrade)
      const next = cost[state] + run * (1 + gradeCostWeight * grade * grade + overGradeWeight * over) + turnCostM * turn
      const to = n * headings + k
      if (next >= cost[to]) continue
      cost[to] = next
      from[to] = state
      open.push(next + Math.hypot(nx - gx, nz - gz) * cellM, to)
    }
  }
  if (reached < 0) return undefined
  const path: Point[] = []
  for (let state = reached; state >= 0; state = from[state]) {
    const c = Math.floor(state / headings)
    const point = { x: west + (c % columns) * cellM, z: south + Math.floor(c / columns) * cellM }
    if (!path.length || path[path.length - 1].x !== point.x || path[path.length - 1].z !== point.z) path.push(point)
  }
  return path.reverse()
}

// Keeps the points that matter to the line's shape (Ramer-Douglas-Peucker), within a tolerance.
function simplify(points: readonly Point[], tolerance: number): Point[] {
  if (points.length <= minimumLine) return [...points]
  const a = points[0], b = points[points.length - 1]
  const length = Math.hypot(b.x - a.x, b.z - a.z) || 1
  let worst = 0, at = 0
  for (let i = 1; i < points.length - 1; i++) {
    const off = Math.abs((points[i].x - a.x) * (b.z - a.z) - (points[i].z - a.z) * (b.x - a.x)) / length
    if (off > worst) [worst, at] = [off, i]
  }
  if (worst <= tolerance) return [a, b]
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)]
}

// How far the path bows to the left of the straight line between two of its points: the
// bend that makes the road's curve follow the path rather than cut the corner.
function bowBetween(path: readonly Point[], from: Point, to: Point) {
  const length = Math.hypot(to.x - from.x, to.z - from.z) || 1
  const left = { x: -(to.z - from.z) / length, z: (to.x - from.x) / length }
  const middle = { x: (from.x + to.x) * half, z: (from.z + to.z) * half }
  // The path point nearest the perpendicular through the middle of the stretch.
  let best = 0, bestAlong = Infinity
  for (const point of path) {
    const along = Math.abs((point.x - middle.x) * (to.x - from.x) + (point.z - middle.z) * (to.z - from.z)) / length
    const across = (point.x - middle.x) * left.x + (point.z - middle.z) * left.z
    if (along < bestAlong && Math.abs(across) < length * half) [best, bestAlong] = [across, along]
  }
  return Math.round(best * bendRounding) / bendRounding
}

// The dots between `a` and `b` (not including them) along a road no steeper than `maxGrade`,
// with a bend for each stretch (one more than the dots) so the road follows the path, or
// undefined if no route exists.
export function suggestRoute(a: Point, b: Point, maxGrade: number): { dots: Point[], bends: number[] } | undefined {
  const path = search(groundGrid(a, b), a, b, maxGrade)
  if (!path) return undefined
  const kept = simplify(path, simplifyToleranceM)
  // Long straight runs get extra dots, so every stretch can still be bent.
  const dots: Point[] = []
  for (let i = 1; i < kept.length; i++) {
    const from = kept[i - 1], to = kept[i]
    const pieces = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / maxDotSpacingM)
    for (let k = 1; k <= pieces; k++) dots.push({ x: from.x + (to.x - from.x) * k / pieces, z: from.z + (to.z - from.z) * k / pieces })
  }
  dots.pop()
  // Dots crowded closer than the minimum spacing make tight kinks; keep the first of each cluster.
  const spaced: Point[] = []
  for (const dot of dots) {
    const previous = spaced[spaced.length - 1] ?? a
    if (Math.hypot(dot.x - previous.x, dot.z - previous.z) >= minDotSpacingM && Math.hypot(dot.x - b.x, dot.z - b.z) >= minDotSpacingM) spaced.push(dot)
  }
  const chain = [a, ...spaced, b]
  return { dots: spaced, bends: chain.slice(1).map((to, i) => bowBetween(path, chain[i], to)) }
}
