import { roadSuggestion } from '../assets/recipes/workbench-roads.ts'
import { naturalGroundHeight, waterLevel } from '../terrain.ts'
import type { Point } from '../world.ts'

// Suggest route: a grade-limited path between two dots over the natural ground, as
// a road surveyor would walk it. The search judges grade on ground smoothed over a
// few cells, because a road is cut and filled through small bumps, and it avoids
// water. The path it finds is thinned to dots a designer can then drag and bend.

interface Grid { west: number, south: number, columns: number, rows: number, heights: Float32Array, wet: Uint8Array }

const { cellM, marginM, smoothPasses, gradeCostWeight, waterMarginM, simplifyToleranceM, maxDotSpacingM } = roadSuggestion
// Steps to the eight neighbours and the eight knight's moves (one cell across, two along), so the
// path is not tied to the grid's angles.
const knight = 2
// A line of two points is already as simple as it gets.
const minimumLine = 2
const signs = [1, -1]
const moves: readonly (readonly [number, number])[] = [
  ...signs.flatMap((a) => [[a, 0], [0, a]] as const),
  ...signs.flatMap((a) => signs.flatMap((b) => [[a, b], [knight * a, b], [a, knight * b]] as const)),
]

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

function search(grid: Grid, a: Point, b: Point, maxGrade: number) {
  const { west, south, columns, rows, heights, wet } = grid
  const cell = (p: Point) => Math.round((p.z - south) / cellM) * columns + Math.round((p.x - west) / cellM)
  const start = cell(a), goal = cell(b), gx = goal % columns, gz = Math.floor(goal / columns)
  const cost = new Float64Array(columns * rows).fill(Infinity)
  const from = new Int32Array(columns * rows).fill(-1)
  const open = new Queue()
  cost[start] = 0
  open.push(0, start)
  while (open.size) {
    const c = open.pop()
    if (c === goal) break
    const cx = c % columns, cz = Math.floor(c / columns)
    for (const [dx, dz] of moves) {
      const nx = cx + dx, nz = cz + dz
      if (nx < 0 || nz < 0 || nx >= columns || nz >= rows) continue
      const n = nz * columns + nx
      if (wet[n] && n !== goal) continue
      const run = Math.hypot(dx, dz) * cellM, grade = Math.abs(heights[n] - heights[c]) / run
      if (grade > maxGrade) continue
      const next = cost[c] + run * (1 + gradeCostWeight * grade * grade)
      if (next >= cost[n]) continue
      cost[n] = next
      from[n] = c
      open.push(next + Math.hypot(nx - gx, nz - gz) * cellM, n)
    }
  }
  if (from[goal] < 0) return undefined
  const path: Point[] = []
  for (let c = goal; c >= 0; c = from[c]) path.push({ x: west + (c % columns) * cellM, z: south + Math.floor(c / columns) * cellM })
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

// The dots between `a` and `b` (not including them) along a road no steeper than `maxGrade`, or undefined if none exists.
export function suggestRoute(a: Point, b: Point, maxGrade: number): Point[] | undefined {
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
  return dots
}
