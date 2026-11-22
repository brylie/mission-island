import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import type { Scene } from '@babylonjs/core/scene'
import { blend, clamp, hash, valueNoise, wrap } from '../math/noise.ts'
import { bakeSurfaceMaps, components, normalMap } from './surface-maps.ts'
import { cellularChips, surfaceNoise as noise, surfaceTextureResolution, tiledLeaves, weatheredMetalSample, type SurfaceTextureResolution } from './recipes/surface-sampling.ts'
import { rgba8 } from './rgba8.ts'
import { surfaceRepeatMeters, type SurfaceRecipe, type SurfaceSettings } from './surface-recipes.ts'

export const noiseTypes = {
  surface: 'Surface presets',
  value: 'Value noise',
  fractal: 'Fractal noise',
  cellular: 'Cellular chips',
  grain: 'Fine grain',
  ripple: 'Ripples',
} as const

const size = surfaceTextureResolution.preview
const half = 0.5
const fullTurnFactor = 2
const sampleContrast = 0.37
const sampleBrightness = 0.94
const anisotropicSamples = 8

function cellular(u: number, v: number, cells: number) {
  const look = cellularChips
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
      const dx = x - i - look.center - hash(ix, iy, look.seed.x) * look.jitter
      const dy = y - j - look.center - hash(ix, iy, look.seed.y) * look.jitter
      const d = dx * dx + dy * dy
      if (d < nearest) {
        next = nearest
        nearest = d
        tone = hash(ix, iy, look.seed.tone)
        face = (dx * look.face.x + dy * look.face.y > look.face.threshold) ? 1 : 0
      }
      else if (d < next) next = d
    }
  }
  const gap = clamp((Math.sqrt(next) - Math.sqrt(nearest) - look.gap.inset) * look.gap.contrast)
  return gap * (look.shade.base + tone * look.shade.tone + face * look.shade.face)
}

function leaves(u: number, v: number) {
  const look = tiledLeaves
  const { lanes } = look
  const cellX = Math.floor(u * lanes)
  const cellY = Math.floor(v * lanes)
  const r = hash(wrap(cellX, lanes), wrap(cellY, lanes), look.seed)
  const x = u * lanes - cellX - half
  const y = v * lanes - cellY - half
  const angle = (r - half) * look.angle.spread + look.angle.base
  const long = x * Math.cos(angle) + y * Math.sin(angle)
  const short = y * Math.cos(angle) - x * Math.sin(angle)
  const bladeWidth = (1 - Math.min(1, Math.abs(long) / look.blade.length)) * (look.blade.width + r * look.blade.widthVariation)
  const blade = clamp((bladeWidth - Math.abs(short)) * look.blade.softness)
  const midrib = clamp(1 - Math.abs(short) * look.midribSharpness) * blade
  const veins = clamp(1 - Math.abs(Math.sin((long - Math.abs(short) * look.veins.slant) * look.veins.repeat)) * look.veins.sharpness) * blade
  return blade * (look.shade.blade + r * look.shade.variation) + midrib * look.shade.midrib + veins * look.shade.veins
}

export const metalTypes = {
  steel: { color: '#b2c0c7', oxide: '#8a412a' },
  brass: { color: '#cfaa59', oxide: '#77743c' },
  copper: { color: '#c78061', oxide: '#4b8274' },
} as const
export type MetalType = keyof typeof metalTypes

interface TextureDetails {
  striations?: number
  metal?: { type: MetalType, color?: string, oxidation: number, abrasion: number }
}

function pattern(name: string, u: number, v: number, striations: number) {
  const fine = valueNoise(u, v, noise.fine.cells, noise.fine.seed)
  const broad = valueNoise(u, v, noise.broad.cells, noise.broad.seed)
  const fractal = broad * noise.fractal.broad + valueNoise(u, v, noise.fractal.cells, noise.fractal.seed) * noise.fractal.middle + fine * noise.fractal.fine
  const ripple = half + Math.sin(Math.PI * fullTurnFactor * (v * noise.ripple.frequency + (broad - half) * noise.ripple.distortion)) * half
  switch (name) {
    case 'value': return broad
    case 'fractal': return fractal
    case 'cellular':
    case 'gravel': return cellular(u, v, noise.chips.cells) * noise.chips.chips + fine * noise.chips.fine
    case 'grain': return fine
    case 'ripple': return ripple * noise.rippleFinish.ripple + fine * noise.rippleFinish.fine
    case 'sand': return ripple * noise.sand.ripple + fine * noise.sand.fine + fractal * noise.sand.fractal
    case 'grass': return fractal * noise.grass.fractal + valueNoise(u, v, noise.grass.cells, noise.grass.seed) * noise.grass.speckle
    case 'leaves': return leaves(u, v) * noise.leaves.leaves + fractal * noise.leaves.fractal
    case 'wood': return valueNoise(u * noise.wood.stretch, v, noise.wood.cells, noise.wood.seed) * noise.wood.grain
      + (half + half * Math.sin(u * Math.PI * fullTurnFactor * striations + broad)) * noise.wood.lines
    case 'metal': return valueNoise(u, v * noise.metal.stretch, noise.metal.cells, noise.metal.seed) * noise.metal.grain + fine * noise.metal.fine
    case 'concrete': return fine * noise.concrete.fine + valueNoise(u, v, noise.concrete.cells, noise.concrete.seed) * noise.concrete.chips
    case 'water': return ripple * noise.water.ripple + fractal * noise.water.fractal
    default: return fractal * noise.default.fractal + fine * noise.default.fine
  }
}

export function createTextureSample(scene: Scene, name: string, scale = 1, contrast = sampleContrast, normalStrength = 0, details: TextureDetails = {}) {
  const heights = new Float32Array(size * size)
  const color = new Uint8Array(heights.length * rgba8.stride)
  const metal = details.metal
  const finish = metal ? metalTypes[metal.type] : undefined
  const tint = finish ? components(metal?.color ?? finish.color) : undefined
  const oxide = finish ? components(finish.oxide) : undefined
  const packed = metal ? new Uint8Array(color.length) : undefined
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) heights[y * size + x] = pattern(name, x / size, y / size, details.striations ?? noise.wood.striations)
  }
  const wear = weatheredMetalSample
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * rgba8.stride
      const brightness = clamp(sampleBrightness + (heights[y * size + x] - half) * contrast)
      if (metal && packed && tint && oxide) {
        const patches = valueNoise(x / size, y / size, wear.broad.cells, wear.broad.seed) * wear.broad.weight
          + valueNoise(x / size, y / size, wear.fine.cells, wear.fine.seed) * wear.fine.weight
        const rust = metal.oxidation > 0 ? clamp((patches - wear.oxidation.threshold + metal.oxidation * wear.oxidation.gain) * wear.oxidation.contrast) : 0
        for (let i = 0; i < rgba8.alpha; i++) color[index + i] = blend(tint[i] * brightness, oxide[i] * brightness, rust)
        color[index + rgba8.alpha] = rgba8.max
        packed.set([rgba8.max, rgba8.max * blend(wear.roughness.base + metal.abrasion * wear.roughness.abrasionGain, wear.roughness.oxidized, rust), rgba8.max * (1 - rust), rgba8.max], index)
      }
      else {
        const gray = Math.round(brightness * rgba8.max)
        color.set([gray, gray, gray, rgba8.max], index)
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
  texture.anisotropicFilteringLevel = anisotropicSamples
  texture.gammaSpace = gammaSpace
  return texture
}

export function createRecipeTextures(scene: Scene, recipe: SurfaceRecipe, settings: SurfaceSettings, size: SurfaceTextureResolution) {
  const { color, normals, finish, emissive } = bakeSurfaceMaps(recipe, settings, size)
  const scale = 1 / surfaceRepeatMeters(recipe, settings)
  return {
    diffuse: uploadTexture(scene, color, size, scale, true, recipe.lengthwise),
    normal: uploadTexture(scene, normals, size, scale, false, recipe.lengthwise),
    finishMap: uploadTexture(scene, finish, size, scale, false, recipe.lengthwise),
    emissive: emissive ? uploadTexture(scene, emissive, size, scale, false, recipe.lengthwise) : null,
  }
}
