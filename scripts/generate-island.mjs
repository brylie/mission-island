// Bakes the Highwood terrain into src/assets/geometry/highwood-heightmap.ts and
// writes a shaded-relief preview with the coastline metrics. Run it with
// `npm run island:generate` after changing src/worlds/starter/layout/island-generation.ts.
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { URL } from 'node:url'
import { deflateSync } from 'node:zlib'
import { heightmapEncoding, islandPreview, pngFormat } from '../src/assets/geometry/island-preview.ts'
import { authoredGroundHeight, originalCoastRadius } from '../src/terrain.ts'
import { island as ellipse } from '../src/world.ts'
import { generateIsland } from '../src/worlds/starter/generation/island-generator.ts'
import { coastlineDimension, shorelineStatistics, slopeShares } from '../src/worlds/starter/generation/island-metrics.ts'
import { highwoodGeneration } from '../src/worlds/starter/layout/island-generation.ts'
import { bakeSources } from '../src/worlds/starter/generation/bake-sources.ts'

const byteMax = heightmapEncoding.byteRange - 1
const crcBits = 8
const halves = 2
const squareMetresPerKm2 = 1e6
const reportDecimals = 3
const millisecondsPerSecond = 1000
const fullTurn = halves * Math.PI
const { bytesPerSample } = heightmapEncoding

const crcTable = Array.from({ length: heightmapEncoding.byteRange }, (_, n) => {
  let c = n
  for (let k = 0; k < crcBits; k++) c = c & 1 ? pngFormat.crcPolynomial ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc(bytes) {
  let c = ~0
  for (const b of bytes) c = crcTable[(c ^ b) & byteMax] ^ (c >>> crcBits)
  return ~c >>> 0
}

function chunk(type, data) {
  const { lengthBytes, typeBytes, crcBytes } = pngFormat
  const out = Buffer.alloc(lengthBytes + typeBytes + data.length + crcBytes)
  out.writeUInt32BE(data.length, 0)
  out.write(type, lengthBytes, 'ascii')
  data.copy(out, lengthBytes + typeBytes)
  out.writeUInt32BE(crc(out.subarray(lengthBytes, lengthBytes + typeBytes + data.length)), lengthBytes + typeBytes + data.length)
  return out
}

function png(width, height, rgb) {
  const { channels } = pngFormat
  const stride = width * channels + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) rgb.copy(raw, y * stride + 1, y * width * channels, (y + 1) * width * channels)
  const header = Buffer.alloc(pngFormat.headerBytes)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, pngFormat.heightOffset)
  header[pngFormat.bitDepthOffset] = pngFormat.bitDepth
  header[pngFormat.colourTypeOffset] = pngFormat.truecolour
  return Buffer.concat([Buffer.from(pngFormat.signature), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const mix = (a, b, t) => a.map((c, k) => c + (b[k] - c) * t)

function landColour(island, i) {
  const { palette, highMetres, light, shadeFloor, shadeGain } = islandPreview
  const { columns, cell, heights } = island
  const h = heights[i]
  const t = Math.min(1, (h - highwoodGeneration.seaLevel) / highMetres)
  const base = t < 1 / halves ? mix(palette.low, palette.mid, t * halves) : mix(palette.mid, palette.high, (t - 1 / halves) * halves)
  const colour = mix(mix(base, palette.sand, island.sand[i]), palette.rock, island.rock[i])
  const gx = (heights[i + 1] ?? h) - (heights[i - 1] ?? h), gz = (heights[i + columns] ?? h) - (heights[i - columns] ?? h)
  const n = { x: -gx / (halves * cell), z: -gz / (halves * cell), y: 1 }
  const shade = Math.max(shadeFloor, (n.x * light.x + n.z * light.z + n.y * light.y) / Math.hypot(n.x, n.y, n.z) * shadeGain)
  return colour.map((c) => c * shade)
}

function previewImage(island) {
  const { columns, rows, heights } = island
  const { channels } = pngFormat
  const { palette, depthMetres } = islandPreview
  const rgb = Buffer.alloc(columns * rows * channels)
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < columns; x++) {
      const i = z * columns + x
      const sea = heights[i] < highwoodGeneration.seaLevel
      const colour = sea ? mix(palette.shallow, palette.deep, Math.min(1, (highwoodGeneration.seaLevel - heights[i]) / depthMetres)) : landColour(island, i)
      // North is up, so the last row is drawn first.
      const o = ((rows - 1 - z) * columns + x) * channels
      for (let k = 0; k < channels; k++) rgb[o + k] = Math.max(0, Math.min(byteMax, Math.round(colour[k])))
    }
  }
  return png(columns, rows, rgb)
}

function cropBounds({ columns, rows, heights }) {
  let minX = columns, maxX = 0, minZ = rows, maxZ = 0
  for (let i = 0; i < heights.length; i++) {
    if (heights[i] < highwoodGeneration.seaLevel) continue
    const x = i % columns, z = Math.floor(i / columns)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }
  const margin = heightmapEncoding.seaMarginM
  return { x0: Math.max(0, minX - margin), x1: Math.min(columns - 1, maxX + margin), z0: Math.max(0, minZ - margin), z1: Math.min(rows - 1, maxZ + margin) }
}

function finalHeight(island, p) {
  const gx = (p.x - island.west) / island.cell, gz = (p.z - island.south) / island.cell
  if (gx < 0 || gz < 0 || gx >= island.columns - 1 || gz >= island.rows - 1) return authoredGroundHeight(p)
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, i = iz * island.columns + ix
  const h = island.heights
  return (h[i] * (1 - fx) + h[i + 1] * fx) * (1 - fz) + (h[i + island.columns] * (1 - fx) + h[i + island.columns + 1] * fx) * fz
}

// The farthest shore along each coast angle, for the skiff buoys and coast helpers.
function reachBytes(island) {
  const { reachAngles, reachLimitM, reachStepM, reachUnitM } = heightmapEncoding
  const out = Buffer.alloc(reachAngles * bytesPerSample)
  for (let a = 0; a < reachAngles; a++) {
    const angle = a / reachAngles * fullTurn
    const dx = Math.cos(angle) * ellipse.width / halves, dz = Math.sin(angle) * ellipse.length / halves
    const unit = Math.hypot(dx, dz)
    let farthest = 0
    for (let d = 0; d < reachLimitM; d += reachStepM) {
      if (finalHeight(island, { x: dx / unit * d, z: dz / unit * d }) >= highwoodGeneration.seaLevel) farthest = d
    }
    out.writeUInt16LE(Math.round(farthest / reachUnitM), a * bytesPerSample)
  }
  return out
}

function encodeLayer(island, values, bounds, encode) {
  const step = highwoodGeneration.layerStep * highwoodGeneration.storeStep
  const layerColumns = Math.floor((bounds.x1 - bounds.x0) / step) + 1, layerRows = Math.floor((bounds.z1 - bounds.z0) / step) + 1
  const out = Buffer.alloc(layerColumns * layerRows)
  for (let z = 0; z < layerRows; z++) {
    for (let x = 0; x < layerColumns; x++) {
      out[z * layerColumns + x] = Math.max(0, Math.min(byteMax, Math.round(encode(values[(z * step + bounds.z0) * island.columns + x * step + bounds.x0]))))
    }
  }
  return { layerColumns, layerRows, base64: out.toString('base64') }
}

// A hash of every file the bake depends on, so a test can spot a stale bake.
function sourceHash() {
  const hash = createHash('sha256')
  for (const path of bakeSources) hash.update(path).update(readFileSync(new URL(`../${path}`, import.meta.url)))
  return hash.digest('hex')
}

function heightmapSource(island) {
  const bounds = cropBounds(island)
  const store = highwoodGeneration.storeStep
  const columns = Math.floor((bounds.x1 - bounds.x0) / store) + 1, rows = Math.floor((bounds.z1 - bounds.z0) / store) + 1
  const at = (x, z) => island.heights[(z * store + bounds.z0) * island.columns + x * store + bounds.x0]
  let min = Infinity, max = -Infinity
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < columns; x++) {
      min = Math.min(min, at(x, z))
      max = Math.max(max, at(x, z))
    }
  }
  const heightStep = (max - min) / heightmapEncoding.u16Max
  const heights = Buffer.alloc(columns * rows * bytesPerSample)
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < columns; x++) heights.writeUInt16LE(Math.round((at(x, z) - min) / heightStep), (z * columns + x) * bytesPerSample)
  }
  const unit = (v) => v * byteMax
  const sand = encodeLayer(island, island.sand, bounds, unit)
  const layers = [
    ['sand', sand],
    ['rock', encodeLayer(island, island.rock, bounds, unit)],
    ['moisture', encodeLayer(island, island.moisture, bounds, unit)],
    ['shore', encodeLayer(island, island.shore, bounds, (v) => v + heightmapEncoding.layerCentre)],
  ]
  return `// Generated by scripts/generate-island.mjs from src/worlds/starter/layout/island-generation.ts.
// Do not edit by hand: change the parameters and run npm run island:generate.
export const highwoodHeightmap = {
  sourceHash: '${sourceHash()}',
  west: ${island.west + bounds.x0 * island.cell},
  south: ${island.south + bounds.z0 * island.cell},
  cell: ${island.cell * store},
  columns: ${columns},
  rows: ${rows},
  heightMin: ${min},
  heightStep: ${heightStep},
  layerStep: ${highwoodGeneration.layerStep},
  layerColumns: ${sand.layerColumns},
  layerRows: ${sand.layerRows},
  reachStep: ${heightmapEncoding.reachUnitM},
  heights: '${heights.toString('base64')}',
  layers: {
${layers.map(([name, layer]) => `    ${name}: '${layer.base64}',`).join('\n')}
  },
  reach: '${reachBytes(island).toString('base64')}',
} as const
`
}

const started = Date.now()
const island = generateIsland({ height: authoredGroundHeight, originalRadius: originalCoastRadius })
const land = (i) => island.heights[i] >= highwoodGeneration.seaLevel
const stats = shorelineStatistics(island, land)
let highest = -Infinity, highestAt = 0
for (let i = 0; i < island.heights.length; i++) {
  if (island.owned[i] > 0 && island.heights[i] > highest) [highest, highestAt] = [island.heights[i], i]
}
const report = {
  seconds: (Date.now() - started) / millisecondsPerSecond,
  landKm2: +(stats.area / squareMetresPerKm2).toFixed(reportDecimals),
  coastlineDimension: +coastlineDimension(island, land).toFixed(reportDecimals),
  shorelineDevelopment: +stats.development.toFixed(reportDecimals),
  slopes: slopeShares(island, land),
  highest: { metres: +highest.toFixed(1), x: island.west + highestAt % island.columns, z: island.south + Math.floor(highestAt / island.columns) },
}
const previewPath = new URL('../docs/images/highwood-generated.png', import.meta.url)
writeFileSync(previewPath, previewImage(island))
const assetPath = new URL('../src/assets/geometry/highwood-heightmap.ts', import.meta.url)
writeFileSync(assetPath, heightmapSource(island))
process.stdout.write(JSON.stringify(report, null, halves) + `\nPreview: ${previewPath.pathname}\nAsset: ${assetPath.pathname}\n`)
