import { highwoodHeightmap } from '../../assets/geometry/highwood-heightmap.ts'
import type { Point } from '../../world.ts'
import { highwoodGeneration } from './layout/island-generation.ts'

// Reads the baked Highwood terrain (scripts/generate-island.mjs). Heights are
// bilinear over a 1 m grid; the shore, sand, rock and moisture layers are
// stored at a coarser step. Outside the grid lies open sea.

const bytesPerHeight = 2
const byteRange = 256
const layerCentre = 128
const byteMax = 255
const fullTurn = Math.PI + Math.PI
// The last full cell sits this many nodes before the grid's edge.
const lastCell = 2

function bytes(base64: string) {
  const text = atob(base64)
  const out = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i)
  return out
}

const map = highwoodHeightmap
const heightBytes = bytes(map.heights)
const heights = new Float32Array(map.columns * map.rows)
for (let i = 0; i < heights.length; i++) {
  heights[i] = map.heightMin + (heightBytes[i * bytesPerHeight] + heightBytes[i * bytesPerHeight + 1] * byteRange) * map.heightStep
}
const layers = {
  sand: bytes(map.layers.sand),
  rock: bytes(map.layers.rock),
  moisture: bytes(map.layers.moisture),
  shore: bytes(map.layers.shore),
}
const reach = Float32Array.from(bytes(map.reach).reduce<number[]>((out, value, i, all) => {
  if (i % bytesPerHeight === 0) out.push((value + all[i + 1] * byteRange) * map.reachStep)
  return out
}, []))

function bilinear(values: ArrayLike<number>, columns: number, rows: number, gx: number, gz: number, outside: number) {
  if (gx < 0 || gz < 0 || gx > columns - 1 || gz > rows - 1) return outside
  const ix = Math.min(columns - lastCell, Math.floor(gx)), iz = Math.min(rows - lastCell, Math.floor(gz))
  const fx = gx - ix, fz = gz - iz
  const i = iz * columns + ix
  const top = values[i] + (values[i + 1] - values[i]) * fx
  const bottom = values[i + columns] + (values[i + columns + 1] - values[i + columns]) * fx
  return top + (bottom - top) * fz
}

export function bakedHeight({ x, z }: Point) {
  return bilinear(heights, map.columns, map.rows, (x - map.west) / map.cell, (z - map.south) / map.cell, highwoodGeneration.seabed)
}

function layer(values: Uint8Array, { x, z }: Point, outside: number) {
  const step = map.cell * map.layerStep
  return bilinear(values, map.layerColumns, map.layerRows, (x - map.west) / step, (z - map.south) / step, outside)
}

// Signed metres to the nearest generated shore, positive inland.
export function bakedShoreMetres(point: Point) {
  return layer(layers.shore, point, 0) - layerCentre
}

export function bakedSurface(point: Point) {
  return {
    sand: layer(layers.sand, point, byteMax) / byteMax,
    rock: layer(layers.rock, point, 0) / byteMax,
    moisture: layer(layers.moisture, point, 0) / byteMax,
  }
}

// Metres from the island's centre to the farthest shore along a coast angle.
export function bakedReach(angle: number) {
  const turns = ((angle / fullTurn) % 1 + 1) % 1
  const sample = turns * reach.length
  const i = Math.floor(sample) % reach.length
  const next = reach[(i + 1) % reach.length]
  return reach[i] + (next - reach[i]) * (sample - Math.floor(sample))
}
