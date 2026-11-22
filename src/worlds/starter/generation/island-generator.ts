import { fbm, ridgedMultifractal } from '../../../math/gradient-noise.ts'
import { seededRandom } from '../../../seeded-random.ts'
import type { Point } from '../../../world.ts'
import { highwoodGeneration } from '../layout/island-generation.ts'
import { accumulateFlow, erodeWithDroplets, fillDepressions, weatherSlopes, type HeightGrid } from './erosion.ts'
import { authoredShare, originalBearing } from './protection.ts'

const noiseRange = 0.7
const smoothstepQuadratic = 3
const smoothstepCubic = 2
const warpSeedX = 101
const warpSeedZ = 202
const detailSeed = 303
const ridgeSeed = 404
const roughSeed = 606
const dropletSeed = 505
const landMarginM = 0.3
const upliftRamp = 6
const upliftBase = 3
const fullTurn = Math.PI + Math.PI
const half = 0.5
// Rays start past the shore cell itself and its neighbours.
const rayStart = 2

function smooth(t: number) {
  const u = Math.max(0, Math.min(1, t))
  return u * u * (smoothstepQuadratic - smoothstepCubic * u)
}

function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t)
}

function polylineDistance(p: Point, points: readonly Point[]) {
  let best = Infinity
  for (let i = 1; i < points.length; i++) best = Math.min(best, segmentDistance(p, points[i - 1], points[i]))
  return best
}

// Metres above sea level before erosion, and how hard the rock is (0 to 1).
function rawLand(p: Point) {
  const { seed, masses, continent, warp, detail, roughness, edgeMargin, edgeSink, grid, uplift, valleys, pins } = highwoodGeneration
  // Domain warping folds the land so ridges and bays flow rather than line up.
  const q = {
    x: p.x + warp.amplitude * fbm(p.x, p.z, seed + warpSeedX, warp) / noiseRange,
    z: p.z + warp.amplitude * fbm(p.x, p.z, seed + warpSeedZ, warp) / noiseRange,
  }
  let influence = 0
  for (const { x, z, rx, rz, weight } of masses) influence = Math.max(influence, weight * smooth(1 - Math.hypot((q.x - x) / rx, (q.z - z) / rz)))
  const edge = Math.min(p.x - grid.west, grid.west + grid.columns * grid.cell - p.x, p.z - grid.south, grid.south + grid.rows * grid.cell - p.z)
  const open = 1 - smooth(edge / edgeMargin)
  // Land fades out well inside the join sector's edges, so its coast is the noise's.
  const { fromBearing, toBearing, landFade } = highwoodGeneration.join
  const bearing = originalBearing(p)
  influence *= smooth((bearing - fromBearing) / landFade) * smooth((toBearing - bearing) / landFade)
  let land = continent.relief * (influence - continent.threshold) + detail.amplitude * fbm(q.x, q.z, seed + detailSeed, detail) / noiseRange - edgeSink * open
  let hardness = 0
  for (const { from, to, radius, strength } of uplift.cores) hardness = Math.max(hardness, strength * smooth(1 - segmentDistance(p, from, to) / radius))
  land += hardness * uplift.height * ridgedMultifractal(q.x, q.z, seed + ridgeSeed, uplift.ridged) * smooth((land + upliftBase) / upliftRamp)
  const rough = Math.max(roughness.interior, 1 - smooth(Math.abs(land) / roughness.coastBand), hardness)
  land += rough * roughness.amplitude * fbm(q.x, q.z, seed + roughSeed, roughness) / noiseRange
  for (const { points, floorWidth, wallWidth, depth } of valleys) {
    land -= depth * (1 - smooth((polylineDistance(p, points) - floorWidth * half) / wallWidth))
  }
  for (const pin of pins) {
    // Measured in warped space, so the crown leans and lobes instead of forming a cone.
    const crown = smooth(1 - Math.hypot(q.x - pin.x - (q.x - p.x), q.z - pin.z - (q.z - p.z) * half) / pin.radius)
    land = Math.max(land, land + (pin.height - land) * crown)
  }
  return { land, hardness }
}

interface AuthoredIsland {
  height(point: Point): number
  originalRadius(point: Point): number
}

interface GeneratedIsland extends HeightGrid {
  west: number
  south: number
  // Share of each node the generator owns (0 = authored island).
  owned: Float32Array
  sand: Float32Array
  rock: Float32Array
  moisture: Float32Array
  // Signed metres to the nearest shore: positive inland.
  shore: Float32Array
}

function nodePoint(index: number) {
  const { west, south, cell, columns } = highwoodGeneration.grid
  return { x: west + (index % columns) * cell, z: south + Math.floor(index / columns) * cell }
}

function initialField(authored: AuthoredIsland) {
  const { grid: { columns, rows }, seaLevel, seabed, shelf } = highwoodGeneration
  const heights = new Float32Array(columns * rows)
  const owned = new Float32Array(columns * rows)
  const hardness = new Float32Array(columns * rows)
  for (let i = 0; i < heights.length; i++) {
    const p = nodePoint(i)
    const { land, hardness: rock } = rawLand(p)
    const generated = land > 0 ? seaLevel + land : Math.max(seabed, seaLevel + land * shelf)
    const keep = authoredShare(p, authored.originalRadius(p))
    // Highwood's land may cover the old shore, but its sea never sinks old land.
    const old = authored.height(p)
    heights[i] = old + (Math.max(old, generated) - old) * (1 - keep)
    owned[i] = 1 - keep
    hardness[i] = rock
  }
  return { heights, owned, hardness }
}

// Signed distance to the shore by two chamfer passes over the land mask.
function shoreDistance(columns: number, rows: number, cell: number, land: (i: number) => boolean) {
  const far = 1e6
  const inside = new Float32Array(columns * rows), outside = new Float32Array(columns * rows)
  for (let i = 0; i < inside.length; i++) {
    inside[i] = land(i) ? far : 0
    outside[i] = land(i) ? 0 : far
  }
  for (const field of [inside, outside]) {
    for (let z = 0; z < rows; z++) for (let x = 0; x < columns; x++) {
      const i = z * columns + x
      if (x > 0) field[i] = Math.min(field[i], field[i - 1] + cell)
      if (z > 0) field[i] = Math.min(field[i], field[i - columns] + cell)
      if (x > 0 && z > 0) field[i] = Math.min(field[i], field[i - columns - 1] + cell * Math.SQRT2)
      if (x < columns - 1 && z > 0) field[i] = Math.min(field[i], field[i - columns + 1] + cell * Math.SQRT2)
    }
    for (let z = rows - 1; z >= 0; z--) for (let x = columns - 1; x >= 0; x--) {
      const i = z * columns + x
      if (x < columns - 1) field[i] = Math.min(field[i], field[i + 1] + cell)
      if (z < rows - 1) field[i] = Math.min(field[i], field[i + columns] + cell)
      if (x < columns - 1 && z < rows - 1) field[i] = Math.min(field[i], field[i + columns + 1] + cell * Math.SQRT2)
      if (x > 0 && z < rows - 1) field[i] = Math.min(field[i], field[i + columns - 1] + cell * Math.SQRT2)
    }
  }
  return inside.map((distance, i) => distance - outside[i])
}

// Wave exposure: the share of directions from a coastal cell that run to open
// sea. Rays start past the cell's own distance from the shore, so a cell a few
// metres inland measures the shore in front of it rather than the land around it.
function exposureAt(grid: HeightGrid, index: number, from: number, sea: (i: number) => boolean) {
  const { columns, rows } = grid
  const { rays, reach } = highwoodGeneration.coast
  const x0 = index % columns, z0 = Math.floor(index / columns)
  let open = 0
  for (let r = 0; r < rays; r++) {
    const angle = r / rays * fullTurn
    let clear = true
    for (let step = from; step < reach; step++) {
      const x = Math.round(x0 + Math.cos(angle) * step), z = Math.round(z0 + Math.sin(angle) * step)
      if (x < 0 || z < 0 || x >= columns || z >= rows) break
      if (!sea(z * columns + x)) {
        clear = false
        break
      }
    }
    if (clear) open++
  }
  return open / rays
}

// Mean of `values` over the cells where `mask` is set, within `radius` cells.
function localMean(columns: number, rows: number, values: Float32Array, mask: Uint8Array, radius: number) {
  const width = columns + 1
  const sum = new Float64Array(width * (rows + 1)), count = new Float64Array(width * (rows + 1))
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < columns; x++) {
      const i = z * columns + x, o = (z + 1) * width + x + 1
      sum[o] = (mask[i] ? values[i] : 0) + sum[o - 1] + sum[o - width] - sum[o - width - 1]
      count[o] = mask[i] + count[o - 1] + count[o - width] - count[o - width - 1]
    }
  }
  const box = (table: Float64Array, x0: number, z0: number, x1: number, z1: number) => table[z1 * width + x1] - table[z0 * width + x1] - table[z1 * width + x0] + table[z0 * width + x0]
  return Float32Array.from(values, (_, i) => {
    const x = i % columns, z = Math.floor(i / columns)
    const x0 = Math.max(0, x - radius), z0 = Math.max(0, z - radius), x1 = Math.min(columns, x + radius + 1), z1 = Math.min(rows, z + radius + 1)
    const n = box(count, x0, z0, x1, z1)
    return n ? box(sum, x0, z0, x1, z1) / n : 0
  })
}

// Era 4: waves sort the coast. Headlands, which stand more exposed than the shore
// around them, and hard granite keep bare rock; sand settles at sheltered bay heads.
function shapeCoast(grid: HeightGrid, owned: Float32Array, shore: Float32Array, hardness: Float32Array) {
  const { seaLevel, coast } = highwoodGeneration
  const { columns, rows, cell, heights } = grid
  const sand = new Float32Array(heights.length), rock = new Float32Array(heights.length)
  const sea = (i: number) => heights[i] < seaLevel
  const band = Uint8Array.from(shore, (metres, i) => Number(owned[i] > 0 && metres >= 0 && metres <= coast.reachInland))
  const exposure = Float32Array.from(shore, (metres, i) => band[i] ? exposureAt(grid, i, Math.ceil(metres / cell) + rayStart, sea) : 0)
  const around = localMean(columns, rows, exposure, band, Math.round(coast.compareRadius / cell))
  for (let i = 0; i < heights.length; i++) {
    if (!band[i]) continue
    const standout = exposure[i] - around[i]
    const x = i % columns, z = Math.floor(i / columns)
    const slope = x > 0 && z > 0 && x < columns - 1 && z < rows - 1
      ? Math.hypot(heights[i + 1] - heights[i - 1], heights[i + columns] - heights[i - columns]) / (cell + cell)
      : 0
    if (shore[i] <= coast.rockReach && (hardness[i] >= coast.hardRock || standout >= coast.headlandAbove || slope >= coast.cliffSlope)) {
      rock[i] = owned[i]
      continue
    }
    const rise = heights[i] - seaLevel
    if (standout <= -coast.bayBelow && rise < coast.beachRise) {
      const share = owned[i] * (1 - smooth(rise / coast.beachRise))
      sand[i] = share
      heights[i] = seaLevel + rise * (1 - share * (1 - coast.beachFlatten))
    }
  }
  return { sand, rock }
}

// Sea joined to the grid's edge. Hollows inland are lakes or pits, not sea.
function openSea(columns: number, rows: number, heights: Float32Array, seaLevel: number) {
  const open = new Uint8Array(heights.length)
  const queue: number[] = []
  for (let i = 0; i < heights.length; i++) {
    const x = i % columns, z = Math.floor(i / columns)
    if ((x === 0 || z === 0 || x === columns - 1 || z === rows - 1) && heights[i] < seaLevel) {
      open[i] = 1
      queue.push(i)
    }
  }
  while (queue.length) {
    const i = queue.pop()!
    const x = i % columns, z = Math.floor(i / columns)
    for (const j of [x > 0 ? i - 1 : -1, x < columns - 1 ? i + 1 : -1, z > 0 ? i - columns : -1, z < rows - 1 ? i + columns : -1]) {
      if (j >= 0 && !open[j] && heights[j] < seaLevel) {
        open[j] = 1
        queue.push(j)
      }
    }
  }
  return open
}

export function generateIsland(authored: AuthoredIsland): GeneratedIsland {
  const { seed, grid: { west, south, cell, columns, rows }, seaLevel, erosion, thermal, drainage } = highwoodGeneration
  const { heights, owned, hardness } = initialField(authored)
  const grid = { columns, rows, cell, heights }
  // Pinned crowns keep their height; everything else the generator owns erodes.
  const shield = Float32Array.from(owned, (own, i) => {
    const p = nodePoint(i)
    let keep = 0
    for (const pin of highwoodGeneration.pins) keep = Math.max(keep, pin.shield * smooth(1 - Math.hypot(p.x - pin.x, p.z - pin.z) / pin.radius))
    return own * (1 - keep)
  })
  const strength = (i: number) => shield[i]
  erodeWithDroplets(grid, erosion, seededRandom(seed + dropletSeed), (i) => owned[i] > 0 && heights[i] > seaLevel + landMarginM, strength, seaLevel)
  // Alternating hard and soft layers in the granite leave benches and steps.
  const strata = (height: number) => 1 - thermal.strataContrast * half * (1 + Math.sin(height / thermal.strataMetres * fullTurn))
  const talus = hardness.map((hard, i) => thermal.softTalus + (thermal.hardTalus - thermal.softTalus) * hard * strata(heights[i]))
  weatherSlopes(grid, thermal, talus, strength)
  const landShore = shoreDistance(columns, rows, cell, (i) => heights[i] >= seaLevel)
  const { sand, rock } = shapeCoast(grid, owned, landShore, hardness)
  // Fill closed hollows so every valley drains to the sea.
  const sea = openSea(columns, rows, heights, seaLevel)
  const filled = fillDepressions(grid, (i) => sea[i] === 1, drainage.spill)
  for (let i = 0; i < heights.length; i++) heights[i] += (filled[i] - heights[i]) * owned[i]
  const flow = accumulateFlow(grid, heights)
  const moisture = flow.map((f) => Math.min(1, Math.log(f) / Math.log(drainage.wetFlow)))
  const shore = shoreDistance(columns, rows, cell, (i) => heights[i] >= seaLevel)
  return { ...grid, west, south, owned, sand, rock, moisture, shore }
}
