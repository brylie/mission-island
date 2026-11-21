import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import type { Scene } from '@babylonjs/core/scene'
import { blend, clamp, hash, valueNoise, wrap } from './math/noise.ts'
import { bakeSurfaceMaps, components, normalMap } from './surface-maps.ts'
import { surfaceRepeatMeters, type SurfaceRecipe, type SurfaceSettings } from './surface-recipes.ts'

export const noiseTypes = {
  surface: 'Surface presets', value: 'Value noise', fractal: 'Fractal noise',
  cellular: 'Cellular chips', grain: 'Fine grain', ripple: 'Ripples',
} as const


const size = 128

function cellular(u: number, v: number, cells: number) {
  const x = u * cells
  const y = v * cells
  let nearest = Infinity
  let next = Infinity
  let tone = 0
  let face = 0
  for (let j = Math.floor(y) - 1; j <= Math.floor(y) + 1; j++) {
    for (let i = Math.floor(x) - 1; i <= Math.floor(x) + 1; i++) {
      const ix = wrap(i, cells)
      const iy = wrap(j, cells)
      const dx = x - i - 0.18 - hash(ix, iy, 32) * 0.65
      const dy = y - j - 0.18 - hash(ix, iy, 43) * 0.65
      const d = dx * dx + dy * dy
      if (d < nearest) {
        next = nearest
        nearest = d
        tone = hash(ix, iy, 18)
        face = (dx * 1.8 + dy * 0.95 > 0.04) ? 1 : 0
      } else if (d < next) next = d
    }
  }
  const gap = clamp((Math.sqrt(next) - Math.sqrt(nearest) - 0.04) * 3.4)
  return gap * (0.42 + tone * 0.35 + face * 0.23)
}

function leaves(u: number, v: number) {
  const lanes = 10
  const cellX = Math.floor(u * lanes)
  const cellY = Math.floor(v * lanes)
  const r = hash(wrap(cellX, lanes), wrap(cellY, lanes), 81)
  const x = u * lanes - cellX - 0.5
  const y = v * lanes - cellY - 0.5
  const angle = (r - 0.5) * 2.4 + 0.72
  const long = x * Math.cos(angle) + y * Math.sin(angle)
  const short = y * Math.cos(angle) - x * Math.sin(angle)
  const bladeWidth = (1 - Math.min(1, Math.abs(long) / 0.535)) * (0.19 + r * 0.095)
  const blade = clamp((bladeWidth - Math.abs(short)) * 38)
  const midrib = clamp(1 - Math.abs(short) * 34) * blade
  const veins = clamp(1 - Math.abs(Math.sin((long - Math.abs(short) * 0.76) * 48)) * 3.7) * blade
  return blade * (0.44 + r * 0.29) + midrib * 0.17 + veins * 0.105
}

export const metalTypes = {
  steel: { color: '#b2c0c7', oxide: '#8a412a' },
  brass: { color: '#cfaa59', oxide: '#77743c' },
  copper: { color: '#c78061', oxide: '#4b8274' },
} as const
export type MetalType = keyof typeof metalTypes

interface TextureDetails {
  striations?: number
  metal?: { type: MetalType; color?: string; oxidation: number; abrasion: number }
}

function pattern(name: string, u: number, v: number, striations: number) {
  const fine = valueNoise(u, v, 48, 8)
  const broad = valueNoise(u, v, 6, 3)
  const fractal = broad * 0.42 + valueNoise(u, v, 16, 6) * 0.36 + fine * 0.22
  const ripple = 0.5 + Math.sin(Math.PI * 2 * (v * 9 + (broad - 0.5) * 0.55)) * 0.5
  switch (name) {
    case 'value': return broad
    case 'fractal': return fractal
    case 'cellular':
    case 'gravel': return cellular(u, v, 18) * 0.91 + fine * 0.09
    case 'grain': return fine
    case 'ripple': return ripple * 0.72 + fine * 0.28
    case 'sand': return ripple * 0.39 + fine * 0.24 + fractal * 0.37
    case 'grass': return fractal * 0.61 + valueNoise(u, v, 64, 10) * 0.39
    case 'leaves': return leaves(u, v) * 0.77 + fractal * 0.23
    case 'wood': return valueNoise(u * 4, v, 12, 51) * 0.52 + (0.5 + 0.5 * Math.sin(u * Math.PI * 2 * striations + broad)) * 0.48
    case 'metal': return valueNoise(u, v * 7, 17, 52) * 0.7 + fine * 0.3
    case 'concrete': return fine * 0.6 + valueNoise(u, v, 24, 37) * 0.4
    case 'water': return ripple * 0.52 + fractal * 0.48
    default: return fractal * 0.7 + fine * 0.3
  }
}

export function createTextureSample(scene: Scene, name: string, scale = 1, contrast = 0.37, normalStrength = 0, details: TextureDetails = {}) {
  const heights = new Float32Array(size * size)
  const color = new Uint8Array(heights.length * 4)
  const metal = details.metal
  const finish = metal ? metalTypes[metal.type] : undefined
  const tint = finish ? components(metal?.color ?? finish.color) : undefined
  const oxide = finish ? components(finish.oxide) : undefined
  const packed = metal ? new Uint8Array(color.length) : undefined
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) heights[y * size + x] = pattern(name, x / size, y / size, details.striations ?? 25)
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4
      const brightness = clamp(0.94 + (heights[y * size + x] - 0.5) * contrast)
      if (metal && packed && tint && oxide) {
        const patches = valueNoise(x / size, y / size, 7, 70) * 0.69 + valueNoise(x / size, y / size, 21, 53) * 0.31
        const rust = metal.oxidation > 0 ? clamp((patches - 0.95 + metal.oxidation * 1.02) * 6) : 0
        for (let i = 0; i < 3; i++) color[index + i] = blend(tint[i] * brightness, oxide[i] * brightness, rust)
        color[index + 3] = 255
        packed.set([255, 255 * blend(0.16 + metal.abrasion * 0.51, 0.91, rust), 255 * (1 - rust), 255], index)
      } else {
        const gray = Math.round(brightness * 255)
        color.set([gray, gray, gray, 255], index)
      }
    }
  }

  return {
    diffuse: uploadTexture(scene, color, size, scale, true),
    normal: normalStrength > 0 ? uploadTexture(scene, normalMap(heights, size, normalStrength), size, scale, false) : null,
    finishMap: packed ? uploadTexture(scene, packed, size, scale, false) : null,
  }
}

function uploadTexture(scene: Scene, pixels: Uint8Array, size: number, scale: number, gammaSpace: boolean, lengthwise = 1) {
  const texture = RawTexture.CreateRGBATexture(pixels, size, size, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE)
  texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE
  texture.uScale = scale
  texture.vScale = scale / lengthwise
  texture.anisotropicFilteringLevel = 8
  texture.gammaSpace = gammaSpace
  return texture
}

export function createRecipeTextures(scene: Scene, recipe: SurfaceRecipe, settings: SurfaceSettings, size: 128 | 256) {
  const { color, normals, finish, emissive } = bakeSurfaceMaps(recipe, settings, size)
  const scale = 1 / surfaceRepeatMeters(recipe, settings)
  return {
    diffuse: uploadTexture(scene, color, size, scale, true, recipe.lengthwise),
    normal: uploadTexture(scene, normals, size, scale, false, recipe.lengthwise),
    finishMap: uploadTexture(scene, finish, size, scale, false, recipe.lengthwise),
    emissive: emissive ? uploadTexture(scene, emissive, size, scale, false, recipe.lengthwise) : null,
  }
}
