import { highwoodGeneration } from '../layout/island-generation.ts'
import type { HeightGrid } from './erosion.ts'

const { boxSizes, slopeBands: bands, steepRise } = highwoodGeneration.metrics
const halves = 2
const quarterTurns = 4
// A shoreline traced along cell edges overstates a curve by 4 / pi on average.
const edgeToCurve = Math.PI / quarterTurns

function isShoreCell({ columns, rows }: HeightGrid, land: (i: number) => boolean, i: number) {
  if (!land(i)) return false
  const x = i % columns, z = Math.floor(i / columns)
  return (x > 0 && !land(i - 1)) || (x < columns - 1 && !land(i + 1)) || (z > 0 && !land(i - columns)) || (z < rows - 1 && !land(i + columns))
}

// Coastline fractal dimension by box counting: the slope of log(boxes touched)
// against log(1 / box size). A smooth curve scores about 1, a real coast 1.2 to 1.3.
export function coastlineDimension(grid: HeightGrid, land: (i: number) => boolean) {
  const { columns, rows } = grid
  const points: { x: number, y: number }[] = []
  for (const size of boxSizes) {
    const boxes = new Set<number>()
    for (let i = 0; i < columns * rows; i++) {
      if (isShoreCell(grid, land, i)) boxes.add(Math.floor(Math.floor(i / columns) / size) * columns + Math.floor((i % columns) / size))
    }
    points.push({ x: Math.log(1 / size), y: Math.log(boxes.size) })
  }
  const n = points.length
  const mx = points.reduce((s, p) => s + p.x, 0) / n, my = points.reduce((s, p) => s + p.y, 0) / n
  return points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / points.reduce((s, p) => s + (p.x - mx) * (p.x - mx), 0)
}

// Land area in square metres, shoreline length, and the shoreline development
// index: shoreline length over the circumference of a circle of the same area.
export function shorelineStatistics(grid: HeightGrid, land: (i: number) => boolean) {
  const { columns, rows, cell } = grid
  let cells = 0, edges = 0
  for (let i = 0; i < columns * rows; i++) {
    if (!land(i)) continue
    cells++
    const x = i % columns, z = Math.floor(i / columns)
    for (const [inside, j] of [[x > 0, i - 1], [x < columns - 1, i + 1], [z > 0, i - columns], [z < rows - 1, i + columns]] as const) {
      if (inside && !land(j)) edges++
    }
  }
  const area = cells * cell * cell
  const length = edges * cell * edgeToCurve
  return { area, length, development: length / (halves * Math.sqrt(Math.PI * area)) }
}

// Share of land cells whose steepest rise per metre falls under each band.
export function slopeShares({ columns, rows, cell, heights }: HeightGrid, land: (i: number) => boolean) {
  const counts = bands.map(() => 0)
  let steep = 0, total = 0
  for (let z = 1; z < rows - 1; z++) {
    for (let x = 1; x < columns - 1; x++) {
      const i = z * columns + x
      if (!land(i)) continue
      const rise = Math.hypot(heights[i + 1] - heights[i - 1], heights[i + columns] - heights[i - columns]) / (cell * halves)
      total++
      if (rise > steepRise) steep++
      const band = bands.findIndex((limit) => rise <= limit)
      if (band >= 0) counts[band]++
    }
  }
  return { bands: bands.map((limit, k) => ({ limit, share: counts[k] / total })), steep: steep / total }
}
