// Erosion and drainage on a square-celled height grid. Heights are metres; the
// grid is row-major with `columns` cells per row.

export interface HeightGrid {
  columns: number
  rows: number
  cell: number
  heights: Float32Array
}

interface DropletErosion {
  droplets: number
  lifetime: number
  inertia: number
  capacity: number
  minimumCapacity: number
  erosion: number
  deposition: number
  evaporation: number
  gravity: number
  radius: number
  // Lowest height erosion may cut to.
  floor: number
}

interface ThermalErosion {
  iterations: number
  rate: number
}

const half = 0.5
const neighbourOffsets = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]] as const
const diagonal = Math.SQRT2
const branching = 2

function heightAndGradient({ columns, heights }: HeightGrid, x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = x - ix, fz = z - iz
  const i = iz * columns + ix
  const a = heights[i], b = heights[i + 1], c = heights[i + columns], d = heights[i + columns + 1]
  return {
    height: a * (1 - fx) * (1 - fz) + b * fx * (1 - fz) + c * (1 - fx) * fz + d * fx * fz,
    gx: (b - a) * (1 - fz) + (d - c) * fz,
    gz: (c - a) * (1 - fx) + (d - b) * fx,
  }
}

function brush(radius: number) {
  const offsets: { dx: number, dz: number, weight: number }[] = []
  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const weight = Math.max(0, radius - Math.hypot(dx, dz))
      if (weight > 0) offsets.push({ dx, dz, weight })
    }
  }
  const total = offsets.reduce((sum, { weight }) => sum + weight, 0)
  return offsets.map((offset) => ({ ...offset, weight: offset.weight / total }))
}

// Hydraulic erosion by simulated raindrops (after Hans Theobald Beyer's droplet
// model). Each drop runs downhill, picks up sediment where it speeds up and drops
// it where it slows, carving gullies and leaving fans and flats. `strength`
// scales the change per cell, so protected ground is left alone.
export function erodeWithDroplets(grid: HeightGrid, settings: DropletErosion, random: () => number, start: (index: number) => boolean, strength: (index: number) => number, waterLevel = -Infinity) {
  const { columns, rows, heights } = grid
  const area = brush(settings.radius)
  const margin = settings.radius + 1
  for (let n = 0; n < settings.droplets; n++) {
    let x = margin + random() * (columns - margin - margin), z = margin + random() * (rows - margin - margin)
    if (!start(Math.floor(z) * columns + Math.floor(x))) continue
    let dirX = 0, dirZ = 0, speed = 1, water = 1, sediment = 0
    for (let step = 0; step < settings.lifetime; step++) {
      const ix = Math.floor(x), iz = Math.floor(z)
      const offsetX = x - ix, offsetZ = z - iz
      const here = heightAndGradient(grid, x, z)
      // A drop that reaches the sea is lost with its load, so coves stay open.
      if (here.height < waterLevel) break
      dirX = dirX * settings.inertia - here.gx * (1 - settings.inertia)
      dirZ = dirZ * settings.inertia - here.gz * (1 - settings.inertia)
      const length = Math.hypot(dirX, dirZ)
      if (length === 0) break
      dirX /= length
      dirZ /= length
      x += dirX
      z += dirZ
      if (x < margin || z < margin || x >= columns - margin || z >= rows - margin) break
      const drop = heightAndGradient(grid, x, z).height - here.height
      const capacity = Math.max(-drop * speed * water * settings.capacity, settings.minimumCapacity)
      const i = iz * columns + ix
      if (sediment > capacity || drop > 0) {
        // Fill the pit behind the drop, or let the surplus settle.
        const amount = drop > 0 ? Math.min(drop, sediment) : (sediment - capacity) * settings.deposition
        sediment -= amount
        const k = strength(i)
        heights[i] += amount * (1 - offsetX) * (1 - offsetZ) * k
        heights[i + 1] += amount * offsetX * (1 - offsetZ) * k
        heights[i + columns] += amount * (1 - offsetX) * offsetZ * k
        heights[i + columns + 1] += amount * offsetX * offsetZ * k
      }
      else {
        const amount = Math.min((capacity - sediment) * settings.erosion, -drop)
        for (const { dx, dz, weight } of area) {
          const j = (iz + dz) * columns + ix + dx
          // Rain cuts gullies, but not below the sea: drowned valleys come from the land's shape.
          const take = Math.max(0, Math.min(amount * weight * strength(j), heights[j] - settings.floor))
          heights[j] -= take
          sediment += take
        }
      }
      speed = Math.sqrt(Math.max(0, speed * speed - drop * settings.gravity))
      water *= 1 - settings.evaporation
    }
  }
}

// Thermal weathering: where a slope is steeper than the rock can hold, the
// surplus slides to the cell below. Hard rock holds steep cliff bands; soft
// ground relaxes to scree and grass slopes. `talus` is the steepest stable
// rise per metre at each cell.
export function weatherSlopes(grid: HeightGrid, { iterations, rate }: ThermalErosion, talus: Float32Array, strength: (index: number) => number) {
  const { columns, rows, cell, heights } = grid
  for (let pass = 0; pass < iterations; pass++) {
    for (let z = 1; z < rows - 1; z++) {
      for (let x = 1; x < columns - 1; x++) {
        const i = z * columns + x
        let steepest = -1, drop = 0
        for (const [dx, dz] of neighbourOffsets) {
          const j = i + dz * columns + dx
          const span = (dx && dz ? diagonal : 1) * cell
          const excess = (heights[i] - heights[j]) - talus[i] * span
          if (excess > drop) {
            drop = excess
            steepest = j
          }
        }
        if (steepest < 0) continue
        const move = drop * rate * half * strength(i)
        heights[i] -= move
        heights[steepest] += move
      }
    }
  }
}

class MinHeap {
  private readonly items: number[] = []
  private readonly key: Float32Array
  constructor(key: Float32Array) {
    this.key = key
  }

  get size() {
    return this.items.length
  }

  push(index: number) {
    const { items, key } = this
    items.push(index)
    let c = items.length - 1
    while (c > 0) {
      const p = (c - 1) >> 1
      if (key[items[p]] <= key[index]) break
      items[c] = items[p]
      c = p
    }
    items[c] = index
  }

  pop() {
    const { items, key } = this
    const top = items[0], last = items.pop()!
    if (items.length) {
      let p = 0
      for (;;) {
        const l = p * branching + 1, r = l + 1
        let c = l
        if (l >= items.length) break
        if (r < items.length && key[items[r]] < key[items[l]]) c = r
        if (key[items[c]] >= key[last]) break
        items[p] = items[c]
        p = c
      }
      items[p] = last
    }
    return top
  }
}

// Priority-flood depression filling (after Barnes, Lehman and Mulla): flood
// inward from the sea, raising every closed hollow just enough to spill, so
// every valley drains to the coast. Returns the filled heights.
export function fillDepressions({ columns, rows, heights }: HeightGrid, sea: (index: number) => boolean, spill: number) {
  const filled = Float32Array.from(heights)
  const done = new Uint8Array(columns * rows)
  const queue = new MinHeap(filled)
  for (let i = 0; i < filled.length; i++) {
    const x = i % columns, z = Math.floor(i / columns)
    if (sea(i) || x === 0 || z === 0 || x === columns - 1 || z === rows - 1) {
      done[i] = 1
      queue.push(i)
    }
  }
  while (queue.size) {
    const i = queue.pop()
    const x = i % columns, z = Math.floor(i / columns)
    for (const [dx, dz] of neighbourOffsets) {
      const nx = x + dx, nz = z + dz
      if (nx < 0 || nz < 0 || nx >= columns || nz >= rows) continue
      const j = nz * columns + nx
      if (done[j]) continue
      done[j] = 1
      filled[j] = Math.max(filled[j], filled[i] + spill)
      queue.push(j)
    }
  }
  return filled
}

// D8 flow accumulation over drained heights: each cell passes its own unit of
// rain plus everything upstream to its steepest downhill neighbour.
export function accumulateFlow({ columns, rows }: HeightGrid, drained: Float32Array) {
  const order = Array.from({ length: drained.length }, (_, i) => i).sort((a, b) => drained[b] - drained[a])
  const flow = new Float32Array(drained.length).fill(1)
  for (const i of order) {
    const x = i % columns, z = Math.floor(i / columns)
    let lowest = -1, best = 0
    for (const [dx, dz] of neighbourOffsets) {
      const nx = x + dx, nz = z + dz
      if (nx < 0 || nz < 0 || nx >= columns || nz >= rows) continue
      const j = nz * columns + nx
      const fall = (drained[i] - drained[j]) / (dx && dz ? diagonal : 1)
      if (fall > best) {
        best = fall
        lowest = j
      }
    }
    if (lowest >= 0) flow[lowest] += flow[i]
  }
  return flow
}
