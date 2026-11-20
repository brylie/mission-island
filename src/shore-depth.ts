import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import { Vector4 } from '@babylonjs/core/Maths/math.vector'
import type { Scene } from '@babylonjs/core/scene'
import { groundHeight, tidePool, waterLevel } from './terrain'

// Heights come from the same function as the rendered beach and wading rules.
// Give the small basin its own tile so the sill has centimetre-scale sampling.
const tiles = {
  coast: { x: -145, z: -70, width: 290, length: 340, columns: 512, rows: 640 },
  basin: { x: tidePool.x - 6, z: tidePool.z - 5, width: 12, length: 10, columns: 256, rows: 224 },
}
type Tile = keyof typeof tiles
const sceneTiles = new WeakMap<Scene, Map<Tile, ReturnType<typeof uploadDepth>>>()
const depthPixels = new Map<Tile, Uint8Array>()

function uploadDepth(scene: Scene, tile: Tile) {
  const { x, z, width, length, columns, rows } = tiles[tile]
  let pixels = depthPixels.get(tile)
  if (!pixels) {
    pixels = new Uint8Array(columns * rows * 4)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const point = { x: x + (col + .5) * width / columns, z: z + (row + .5) * length / rows }
        const depth = waterLevel - groundHeight(point)
        const normalized = Math.max(0, Math.min(1, (depth + .25) / 2.75))
        const packed = Math.round(normalized * 65535)
        pixels.set([packed >> 8, packed & 255, 0, 255], (row * columns + col) * 4)
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
