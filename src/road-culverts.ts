import { roadDrainage } from './assets/geometry/road-kinds.ts'
import type { Point } from './world.ts'

// Culverts: where grading leaves a hollow that would hold water, a pipe takes it under or past
// the road. A road builder places one wherever a fill dams a draw or a road dips in a cut; here
// they are found the same way. Rain is flooded over the ground around the roads twice, once as
// nature left it and once as graded, and every pond the grading deepens is a basin that needs a
// culvert. Each basin gets one, at its lowest point, whose outlet is where the natural ground,
// followed downhill, leaves the earthworks with enough fall for the pipe to run.

export interface Culvert {
  road: string
  // Metres along the road nearest the inlet.
  along: number
  inlet: Point
  // Undefined where no lower ground lies within reach: water would stand there.
  outlet: Point | undefined
  // How deep the water would stand at the inlet without the culvert, in metres.
  depth: number
}

type Ground = (point: Point) => number

const { stepM, pondM, minFall, sinkM, outletSteps, pipeReachM } = roadDrainage
// Eight directions round a circle of one step, as water running downhill would test them.
const directions = 8
const fullTurn = Math.PI + Math.PI
const neighbours = Array.from({ length: directions }, (_, k) => [Math.cos(k * fullTurn / directions), Math.sin(k * fullTurn / directions)] as const)
const gridSteps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const

// A lattice of cells over the box around the given points, padded by the pipe reach.
function lattice(points: readonly Point[]) {
  const xs = points.map((point) => point.x), zs = points.map((point) => point.z)
  const west = Math.floor(Math.min(...xs) - pipeReachM), south = Math.floor(Math.min(...zs) - pipeReachM)
  const columns = Math.ceil((Math.max(...xs) + pipeReachM - west) / stepM) + 1
  const rows = Math.ceil((Math.max(...zs) + pipeReachM - south) / stepM) + 1
  const pointOf = (cell: number) => ({ x: west + (cell % columns) * stepM, z: south + Math.floor(cell / columns) * stepM })
  const cellOf = ({ x, z }: Point) => Math.round((z - south) / stepM) * columns + Math.round((x - west) / stepM)
  return { columns, rows, size: columns * rows, pointOf, cellOf }
}

// A binary min-heap of cells keyed by level.
function createHeap(levels: Float64Array) {
  const items: number[] = []
  const less = (a: number, b: number) => levels[items[a]] < levels[items[b]] || (levels[items[a]] === levels[items[b]] && items[a] < items[b])
  const swap = (a: number, b: number) => ([items[a], items[b]] = [items[b], items[a]])
  return {
    get size() { return items.length },
    push(cell: number) {
      items.push(cell)
      for (let i = items.length - 1; i > 0;) {
        const parent = (i - 1) >> 1
        if (!less(i, parent)) break
        swap(i, parent)
        i = parent
      }
    },
    pop() {
      const top = items[0], last = items.pop() as number
      if (items.length) {
        items[0] = last
        for (let i = 0; ;) {
          const left = i + i + 1, right = left + 1
          let least = i
          if (left < items.length && less(left, least)) least = left
          if (right < items.length && less(right, least)) least = right
          if (least === i) break
          swap(i, least)
          i = least
        }
      }
      return top
    },
  }
}

// The level water would fill each cell to before spilling off the lattice's edge (a priority flood).
function flood(grid: ReturnType<typeof lattice>, heights: Float64Array) {
  const { columns, rows, size } = grid
  const filled = new Float64Array(size).fill(Infinity)
  const heap = createHeap(filled)
  for (let cell = 0; cell < size; cell++) {
    const i = cell % columns, j = Math.floor(cell / columns)
    if (i === 0 || j === 0 || i === columns - 1 || j === rows - 1) {
      filled[cell] = heights[cell]
      heap.push(cell)
    }
  }
  while (heap.size) {
    const cell = heap.pop()
    const i = cell % columns, j = Math.floor(cell / columns)
    for (const [di, dj] of gridSteps) {
      const ni = i + di, nj = j + dj
      if (ni < 0 || nj < 0 || ni >= columns || nj >= rows) continue
      const next = nj * columns + ni
      if (filled[next] !== Infinity) continue
      filled[next] = Math.max(heights[next], filled[cell])
      heap.push(next)
    }
  }
  return filled
}

// Ponds the grading made or deepened: connected wet cells standing at one water level, each
// with its lowest cell and its depth there.
function basins(grid: ReturnType<typeof lattice>, graded: Float64Array, natural: Float64Array) {
  const gradedLevel = flood(grid, graded), naturalLevel = flood(grid, natural)
  const { columns, rows, size } = grid
  const wet = (cell: number) => gradedLevel[cell] - graded[cell] > pondM && gradedLevel[cell] - graded[cell] - (naturalLevel[cell] - natural[cell]) > pondM
  const seen = new Uint8Array(size)
  const found: { lowest: number, depth: number }[] = []
  for (let start = 0; start < size; start++) {
    if (seen[start] || !wet(start)) continue
    const level = gradedLevel[start]
    let lowest = start
    const stack = [start]
    seen[start] = 1
    while (stack.length) {
      const cell = stack.pop() as number
      if (graded[cell] < graded[lowest]) lowest = cell
      const i = cell % columns, j = Math.floor(cell / columns)
      for (const [di, dj] of gridSteps) {
        const ni = i + di, nj = j + dj
        if (ni < 0 || nj < 0 || ni >= columns || nj >= rows) continue
        const next = nj * columns + ni
        if (seen[next] || !wet(next) || gradedLevel[next] !== level) continue
        seen[next] = 1
        stack.push(next)
      }
    }
    found.push({ lowest, depth: level - graded[lowest] })
  }
  return found
}

// Whether a pipe from the inlet to this point falls enough for water to run: at least `minFall`
// per metre of its length, and at least `sinkM`.
const fallsTo = (inlet: Point, inletHeight: number, at: Point, height: number) =>
  inletHeight - height >= Math.max(sinkM, Math.hypot(at.x - inlet.x, at.z - inlet.z) * minFall)

// Where water leaving the inlet ends up: down the natural ground until it is past the earthworks.
function outletFrom(inlet: Point, natural: Ground, graded: Ground) {
  const inletHeight = graded(inlet)
  let at = inlet
  for (let step = 0; step < outletSteps; step++) {
    let next = at
    for (const [dx, dz] of neighbours) {
      const q = { x: at.x + dx * stepM, z: at.z + dz * stepM }
      if (natural(q) < natural(next)) next = q
    }
    // Past the earthworks and low enough for the pipe to fall: the water runs on from here.
    if (Math.abs(graded(at) - natural(at)) < sinkM && fallsTo(inlet, inletHeight, at, graded(at))) return at
    if (next === at) break
    at = next
  }
  return nearestLower(inlet, natural, graded)
}

// A sag in a cut can sit below all the natural ground downhill. Its culvert runs to the nearest
// point, ring by ring, that the earthworks leave alone and that lies low enough below the inlet.
function nearestLower(inlet: Point, natural: Ground, graded: Ground) {
  const inletHeight = graded(inlet)
  for (let r = stepM; r <= pipeReachM; r += stepM) {
    const around = Math.ceil(fullTurn * r / stepM)
    for (let k = 0; k < around; k++) {
      const at = { x: inlet.x + Math.cos(k * fullTurn / around) * r, z: inlet.z + Math.sin(k * fullTurn / around) * r }
      if (Math.abs(graded(at) - natural(at)) < sinkM && fallsTo(inlet, inletHeight, at, natural(at))) return at
    }
  }
  return undefined
}

export function findCulverts(points: readonly Point[], natural: Ground, graded: Ground, nearestRoad: (point: Point) => { road: string, along: number }): Culvert[] {
  if (!points.length) return []
  const grid = lattice(points)
  const naturalHeights = new Float64Array(grid.size), gradedHeights = new Float64Array(grid.size)
  for (let cell = 0; cell < grid.size; cell++) {
    const point = grid.pointOf(cell)
    naturalHeights[cell] = natural(point)
    gradedHeights[cell] = graded(point)
  }
  return basins(grid, gradedHeights, naturalHeights).map(({ lowest, depth }) => {
    const inlet = grid.pointOf(lowest)
    return { ...nearestRoad(inlet), inlet, outlet: outletFrom(inlet, natural, graded), depth }
  })
}
