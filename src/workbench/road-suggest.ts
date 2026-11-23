import { roadSuggestion } from '../assets/recipes/workbench-roads.ts'
import { naturalGroundHeight, waterLevel } from '../terrain.ts'
import type { Point } from '../world.ts'

// Suggest route: a grade-limited path between two dots over the natural ground, as
// a road surveyor would walk it. The search judges grade on ground smoothed over a
// few cells, because a road is cut and filled through small bumps, and it avoids
// water. The path it finds is pulled straight wherever a straight road holds the grade,
// as real roads are built, then thinned to dots a designer can then drag and bend.

interface Grid { west: number, south: number, columns: number, rows: number, heights: Float32Array, wet: Uint8Array }

const { cellM, marginM, smoothPasses, gradeCostWeight, overGradeWeight, hardGradeShare, turnCostM, straightenTurnRad, waterMarginM, maxDotSpacingM, minDotSpacingM } = roadSuggestion
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

// The smoothed ground at a point, between grid nodes.
function heightAt({ west, south, columns, rows, heights }: Grid, { x, z }: Point) {
  const gx = Math.min(columns - 1 - Number.EPSILON, Math.max(0, (x - west) / cellM)), gz = Math.min(rows - 1 - Number.EPSILON, Math.max(0, (z - south) / cellM))
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, at = j * columns + i
  return (heights[at] * (1 - fx) + heights[at + 1] * fx) * (1 - fz) + (heights[at + columns] * (1 - fx) + heights[at + columns + 1] * fx) * fz
}

// Whether a straight road from `a` to `b` stays dry and within `maxGrade`, judged every half cell.
function straightFits(grid: Grid, a: Point, b: Point, maxGrade: number) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (cellM * half))
  const run = Math.hypot(b.x - a.x, b.z - a.z) / steps
  let previous = heightAt(grid, a)
  for (let k = 1; k <= steps; k++) {
    const point = { x: a.x + (b.x - a.x) * k / steps, z: a.z + (b.z - a.z) * k / steps }
    const height = heightAt(grid, point)
    if (height < waterLevel + waterMarginM || Math.abs(height - previous) / run > maxGrade) return false
    previous = height
  }
  return true
}

function turnBetween(a: Point, b: Point, c: Point) {
  const first = Math.atan2(b.z - a.z, b.x - a.x), second = Math.atan2(c.z - b.z, c.x - b.x)
  return Math.abs(Math.atan2(Math.sin(second - first), Math.cos(second - first)))
}

// Pulls the path straight: from each kept point, on to the furthest later point a straight
// road reaches within the grade without turning sharply from the run before it.
function straighten(grid: Grid, path: readonly Point[], maxGrade: number) {
  const kept = [path[0]]
  for (let i = 0; i < path.length - 1;) {
    // The run before this one: the kept point before the last, if there is one.
    const previous = kept.at(-1 - 1)
    let next = i + 1
    for (let j = next + 1; j < path.length; j++) {
      if (previous && turnBetween(previous, path[i], path[j]) > straightenTurnRad) continue
      if (straightFits(grid, path[i], path[j], maxGrade)) next = j
    }
    kept.push(path[next])
    i = next
  }
  return kept
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
  const grid = groundGrid(a, b)
  const found = search(grid, a, b, maxGrade)
  if (!found) return undefined
  // The road runs from the dots themselves, not the grid cells nearest them.
  const kept = straighten(grid, [a, ...found.slice(1, -1), b], maxGrade)
  const path = kept
  // Long straight runs get extra dots, so every stretch can still be bent.
  const dots: Point[] = []
  for (let i = 1; i < kept.length; i++) {
    const from = kept[i - 1], to = kept[i]
    const pieces = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / maxDotSpacingM)
    for (let k = 1; k <= pieces; k++) dots.push({ x: from.x + (to.x - from.x) * k / pieces, z: from.z + (to.z - from.z) * k / pieces })
  }
  dots.pop()
  // A bend found on the grid is a run of short steps. Thin each run to dots at least the
  // minimum spacing apart, always keeping the dot where the next straight run begins, so the
  // road's curve takes the bend and its straight runs stay straight.
  const far = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.z - q.z) >= minDotSpacingM
  const spaced: Point[] = []
  dots.forEach((dot, i) => {
    const next = dots[i + 1] ?? b
    if (far(dot, spaced.at(-1) ?? a)) spaced.push(dot)
    // The start of a straight run replaces a dot crowding it.
    else if (far(dot, next) && spaced.length) spaced[spaced.length - 1] = dot
  })
  while (spaced.length && !far(spaced[spaced.length - 1], b)) spaced.pop()
  const chain = [a, ...spaced, b]
  return { dots: spaced, bends: chain.slice(1).map((to, i) => bowBetween(path, chain[i], to)) }
}
