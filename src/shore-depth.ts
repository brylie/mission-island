import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import { Vector4 } from '@babylonjs/core/Maths/math.vector'
import type { Scene } from '@babylonjs/core/scene'
import { shoreDepthEncoding, shoreDepthTiles } from './assets/effects/shore-depth'
import { rgba8 } from './assets/rgba8'
import { coastBounds, groundHeight, tidePool, waterLevel } from './terrain'
import { shoreStations } from './worlds/starter/layout/terrain'

const half = 0.5

// Heights come from the same function as the rendered beach and wading rules.
// Give the small basin its own tile so the sill has centimetre-scale sampling.
const { west, east, south, north } = coastBounds(shoreStations.seabed.radius)
const { coast, basin } = shoreDepthTiles
const border = coast.border
const tiles = {
  coast: { x: west - border, z: south - border, width: east - west + border + border, length: north - south + border + border, columns: coast.columns, rows: coast.rows },
  basin: { x: tidePool.x - basin.halfWidth, z: tidePool.z - basin.halfLength, width: basin.halfWidth + basin.halfWidth, length: basin.halfLength + basin.halfLength, columns: basin.columns, rows: basin.rows },
}
type Tile = keyof typeof tiles
const sceneTiles = new WeakMap<Scene, Map<Tile, ReturnType<typeof uploadDepth>>>()
const depthPixels = new Map<Tile, Uint8Array>()

function uploadDepth(scene: Scene, tile: Tile) {
  const { x, z, width, length, columns, rows } = tiles[tile]
  let pixels = depthPixels.get(tile)
  if (!pixels) {
    pixels = new Uint8Array(columns * rows * rgba8.stride)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const point = { x: x + (col + half) * width / columns, z: z + (row + half) * length / rows }
        const depth = waterLevel - groundHeight(point)
        const normalized = Math.max(0, Math.min(1, (depth + shoreDepthEncoding.depthBias) / shoreDepthEncoding.depthSpan))
        const packed = Math.round(normalized * shoreDepthEncoding.max)
        pixels.set([packed >> shoreDepthEncoding.highShift, packed & rgba8.max, 0, rgba8.max], (row * columns + col) * rgba8.stride)
      }
    }
    depthPixels.set(tile, pixels)
  }
  const texture = RawTexture.CreateRGBATexture(pixels, columns, rows, scene, false, false, Texture.BILINEAR_SAMPLINGMODE)
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE
  return { texture, bounds: new Vector4(x, z, width, length) }
}

export function createShoreDepth(scene: Scene, tile: Tile) {
  let cache = sceneTiles.get(scene)
  if (!cache) {
    cache = new Map()
    sceneTiles.set(scene, cache)
  }
  const ready = cache.get(tile)
  if (ready) return ready
  const depth = uploadDepth(scene, tile)
  cache.set(tile, depth)
  return depth
}
