import { roadSuggestion } from '../assets/recipes/workbench-roads.ts'
import { naturalGroundHeight, waterLevel } from '../terrain.ts'
import type { Point } from '../world.ts'

// Suggest route: a grade-limited path between two dots over the natural ground, as
// a road surveyor would walk it. The search judges grade on ground smoothed over a
// few cells, because a road is cut and filled through small bumps, and it avoids
// water. The path it finds is pulled straight wherever a straight road holds the grade,
// as real roads are built, then thinned to dots a designer can then drag and bend.

interface Grid { west: number, south: number, columns: number, rows: number, heights: Float32Array, wet: Uint8Array }

const { cellM, marginM, smoothPasses, gradeCostWeight, overGradeWeight, hardGradeShare, turnCostM, straightenTurnRad, waterMarginM, maxDotSpacingM, minDotSpacingM, hairpin } = roadSuggestion
// Steps to the eight neighbours and the eight knight's moves (one cell across, two along),
// sorted by direction, so the path is not tied to the grid's angles. Each step may turn
// only to a neighbouring direction, as a vehicle turns gradually: with 4 m cells that holds
// bends to about a 9 m radius, wide enough for the Fire and Rescue pickup, and a switchback
// has to be a real hairpin loop.
const knight = 2
const half = 0.5
const square = 2
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

function groundGrid(a: Point, b: Point, ground: (point: Point) => number): Grid {
  const west = Math.min(a.x, b.x) - marginM, south = Math.min(a.z, b.z) - marginM
  const columns = Math.ceil((Math.max(a.x, b.x) + marginM - west) / cellM) + 1, rows = Math.ceil((Math.max(a.z, b.z) + marginM - south) / cellM) + 1
  let heights = new Float32Array(columns * rows)
  const wet = new Uint8Array(columns * rows)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const height = ground({ x: west + i * cellM, z: south + j * cellM })
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

// One point of the found path, and the hairpin that leads from it to the next, if one does.
interface PathPoint { point: Point, heading: number, hairpin?: number }

const degreesPerHalfTurn = 180
// Every hairpin the search may take: to the left (+) or right (−), through each sweep.
const hairpinTurns = [1, -1].flatMap((side) => hairpin.sweepsDeg.map((degrees) => side * degrees * Math.PI / degreesPerHalfTurn))
const headingAngles = moves.map(([dx, dz]) => Math.atan2(dz, dx))

// A hairpin from `start`, heading at `angle`, turning through `turn` radians on a circle of the
// hairpin radius: where it ends, its exit angle, the dots round it and its length.
function hairpinArc(start: Point, angle: number, turn: number) {
  const r = hairpin.radiusM, side = Math.sign(turn)
  const centre = { x: start.x - side * Math.sin(angle) * r, z: start.z + side * Math.cos(angle) * r }
  const at = (t: number) => {
    const a = Math.atan2(start.z - centre.z, start.x - centre.x) + turn * t
    return { x: centre.x + Math.cos(a) * r, z: centre.z + Math.sin(a) * r }
  }
  const quarters = hairpin.dotShares.map(at)
  return { centre, end: at(1), exitAngle: angle + turn, dots: quarters, length: Math.abs(turn) * r }
}

const nearestHeading = (angle: number) => headingAngles.reduce((best, a, k) => Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) < Math.abs(Math.atan2(Math.sin(angle - headingAngles[best]), Math.cos(angle - headingAngles[best]))) ? k : best, 0)

// A* over (cell, heading) states: turning costs extra in proportion to how sharply the
// heading changes, so the path sweeps round bends a vehicle can take rather than zigzagging.
// A hairpin turns the path back on itself across the slope in one move, as a switchback does.
function search(grid: Grid, a: Point, b: Point, maxGrade: number) {
  const { west, south, columns, rows, heights, wet } = grid
  const headings = moves.length
  // Each state also remembers how many steps it has come since a hairpin, up to `settled`, so
  // the legs of a switchback have length.
  const settled = Math.ceil(hairpin.minLegM / cellM), memories = settled + 1
  const stateOf = (c: number, h: number, m: number) => (c * headings + h) * memories + m
  const cell = (p: Point) => Math.round((p.z - south) / cellM) * columns + Math.round((p.x - west) / cellM)
  const start = cell(a), goal = cell(b), gx = goal % columns, gz = Math.floor(goal / columns)
  const cost = new Float64Array(columns * rows * headings * memories).fill(Infinity)
  const from = new Int32Array(cost.length).fill(-1)
  const viaHairpin = new Uint8Array(cost.length)
  const lengths = moves.map(([dx, dz]) => Math.hypot(dx, dz))
  const stepCost = (run: number, grade: number) => run * (1 + gradeCostWeight * grade * grade + overGradeWeight * Math.max(0, grade - maxGrade))
  const open = new Queue()
  // The road runs a leg before its first hairpin, too.
  for (let h = 0; h < headings; h++) {
    cost[stateOf(start, h, 0)] = 0
    open.push(0, stateOf(start, h, 0))
  }
  // `hairpinChoice` is 0 for an ordinary step, or one more than the hairpin turn taken.
  const relax = (state: number, to: number, next: number, hairpinChoice: number) => {
    if (next >= cost[to]) return
    cost[to] = next
    from[to] = state
    viaHairpin[to] = hairpinChoice
    const n = Math.floor(to / memories / headings)
    open.push(next + Math.hypot(n % columns - gx, Math.floor(n / columns) - gz) * cellM, to)
  }
  let reached = -1
  while (open.size) {
    const state = open.pop()
    const m = state % memories, h = Math.floor(state / memories) % headings, c = Math.floor(state / memories / headings)
    if (c === goal) {
      reached = state
      break
    }
    const cx = c % columns, cz = Math.floor(c / columns)
    const [hx, hz] = moves[h]
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
      const turn = 1 - (hx * dx + hz * dz) / (lengths[h] * lengths[k])
      relax(state, stateOf(n, k, Math.min(settled, m + Math.round(lengths[k]))), cost[state] + stepCost(run, grade) + turnCostM * turn, 0)
    }
    if (m < settled) continue
    // A hairpin to either side, turning the road back up the slope.
    const here = { x: west + cx * cellM, z: south + cz * cellM }
    hairpinTurns.forEach((turn, choice) => {
      const arc = hairpinArc(here, headingAngles[h], turn)
      const nx = Math.round((arc.end.x - west) / cellM), nz = Math.round((arc.end.z - south) / cellM)
      if (nx < 0 || nz < 0 || nx >= columns || nz >= rows) return
      const n = nz * columns + nx
      if (wet[n] || wet[c] || n === goal) return
      const rise = Math.abs(heights[n] - heights[c]), grade = rise / arc.length
      if (grade > maxGrade * hardGradeShare || rise / Math.hypot(arc.end.x - here.x, arc.end.z - here.z) > hairpin.maxSlope) return
      relax(state, stateOf(n, nearestHeading(arc.exitAngle), 0), cost[state] + stepCost(arc.length, grade) + hairpin.costM, choice + 1)
    })
  }
  if (reached < 0) return undefined
  const states: number[] = []
  for (let state = reached; state >= 0; state = from[state]) states.push(state)
  states.reverse()
  return states.map((state, i): PathPoint => {
    const c = Math.floor(state / memories / headings)
    // A point starts a hairpin when the move out of it was one.
    const choice = viaHairpin[states[i + 1]]
    return { point: { x: west + (c % columns) * cellM, z: south + Math.floor(c / columns) * cellM }, heading: Math.floor(state / memories) % headings, hairpin: choice ? choice - 1 : undefined }
  })
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
// road reaches within the grade without turning sharply from the run before it. `entry` and
// `exit` are points just before and after the path, where it meets a hairpin, so the straight
// runs leave and join the hairpin along its tangent.
function straighten(grid: Grid, path: readonly Point[], maxGrade: number, entry?: Point, exit?: Point) {
  const kept = [path[0]]
  const joinTurn = straightenTurnRad * half
  for (let i = 0; i < path.length - 1;) {
    // The run before this one: the kept point before the last, or the hairpin's tangent.
    const previous = kept.at(-1 - 1) ?? entry
    const limit = kept.length > 1 ? straightenTurnRad : joinTurn
    let next = i + 1
    for (let j = next + 1; j < path.length; j++) {
      if (previous && turnBetween(previous, path[i], path[j]) > limit) continue
      if (exit && j === path.length - 1 && turnBetween(path[i], path[j], exit) > joinTurn) continue
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

// One leg's dots, from its first point to its last: pulled straight, with long runs split
// so every stretch can still be bent, and the short steps of a bend found on the grid thinned
// to dots at least the minimum spacing apart. The dot where the next straight run begins is
// always kept, so the road's curve takes the bend and its straight runs stay straight.
function legDots(grid: Grid, leg: readonly Point[], maxGrade: number, entry?: Point, exit?: Point) {
  const kept = straighten(grid, leg, maxGrade, entry, exit)
  const first = kept[0], last = kept[kept.length - 1]
  const dots: Point[] = []
  for (let i = 1; i < kept.length; i++) {
    const from = kept[i - 1], to = kept[i]
    const pieces = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / maxDotSpacingM)
    for (let k = 1; k <= pieces; k++) dots.push({ x: from.x + (to.x - from.x) * k / pieces, z: from.z + (to.z - from.z) * k / pieces })
  }
  dots.pop()
  const far = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.z - q.z) >= minDotSpacingM
  const spaced: Point[] = []
  dots.forEach((dot, i) => {
    const next = dots[i + 1] ?? last
    if (far(dot, spaced.at(-1) ?? first)) spaced.push(dot)
    // The start of a straight run replaces a dot crowding it.
    else if (far(dot, next) && spaced.length) spaced[spaced.length - 1] = dot
  })
  while (spaced.length && !far(spaced[spaced.length - 1], last)) spaced.pop()
  return { dots: [first, ...spaced, last], kept }
}

// The bend that puts the middle of a stretch between two points of a circle onto the circle:
// its sagitta, away from the centre (+ is left of travel).
function arcBend(from: Point, to: Point, centre: Point) {
  const radius = Math.hypot(from.x - centre.x, from.z - centre.z)
  const chord = Math.hypot(to.x - from.x, to.z - from.z) || 1
  const sagitta = radius - Math.sqrt(Math.max(0, radius * radius - chord * chord * half * half))
  const leftOfTravel = (centre.x - from.x) * -(to.z - from.z) + (centre.z - from.z) * (to.x - from.x)
  return Math.round((leftOfTravel > 0 ? -sagitta : sagitta) * bendRounding) / bendRounding
}

// The dots between `a` and `b` (not including them) along a road no steeper than `maxGrade`,
// with a bend for each stretch (one more than the dots) so the road follows the path, or
// undefined if no route exists. `ground` is the natural ground unless a test gives its own.
export function suggestRoute(a: Point, b: Point, maxGrade: number, ground: (point: Point) => number = naturalGroundHeight): { dots: Point[], bends: number[] } | undefined {
  const grid = groundGrid(a, b, ground)
  const found = search(grid, a, b, maxGrade)
  if (!found) return undefined
  // The road runs from the dots themselves, not the grid cells nearest them; a leg after a
  // hairpin starts where the hairpin's arc ends.
  const points = found.map((entry, i) => i === 0 ? a : i === found.length - 1 ? b : entry.point)
  const arcs = found.map((entry, i) => entry.hairpin === undefined ? undefined : hairpinArc(points[i], headingAngles[entry.heading], hairpinTurns[entry.hairpin]))
  arcs.forEach((arc, i) => {
    if (arc && i + 1 < found.length - 1) points[i + 1] = arc.end
  })
  // Legs run between hairpins; each is straightened on its own and the hairpins keep their shape.
  const chain: Point[] = [], shape: Point[] = [], round = new Map<number, number>()
  let legStart = 0
  // A point a step along the tangent the road leaves a hairpin on, and one ahead where it enters one.
  const tangentPoint = (point: Point, angle: number, sign: number) => ({ x: point.x + sign * Math.cos(angle), z: point.z + sign * Math.sin(angle) })
  found.forEach((entry, i) => {
    const arc = arcs[i]
    if (!arc && i < found.length - 1) return
    const before = arcs[legStart - 1]
    const legEntry = before && tangentPoint(points[legStart], before.exitAngle, -1)
    const legExit = arc && tangentPoint(points[i], headingAngles[entry.heading], 1)
    const legPoints = points.slice(legStart, i + 1)
    if (legPoints.length < square) return
    const leg = legDots(grid, legPoints, maxGrade, legEntry, legExit)
    chain.push(...(chain.length ? leg.dots.slice(1) : leg.dots))
    shape.push(...leg.kept)
    if (arc) {
      // Each stretch round a hairpin bows out onto its circle, so its middle lies on it too.
      const round3 = [points[i], ...arc.dots, points[i + 1]]
      for (let k = 1; k < round3.length; k++) round.set(chain.length - 1 + k - 1, arcBend(round3[k - 1], round3[k], arc.centre))
      chain.push(...arc.dots, points[i + 1])
      shape.push(...arc.dots)
      legStart = i + 1
    }
  })
  return { dots: chain.slice(1, -1), bends: chain.slice(1).map((to, i) => round.get(i) ?? bowBetween(shape, chain[i], to)) }
}
